import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run, toHttpError } from '../../utils/api-response';
import { activeRules, applyRules } from '../discount-rules/discount-rules.service';
import { notifyMany } from '../notifications/notifications.service';
import { currentId } from '../semesters/semesters.service';
import type { bulkInvoiceSchema } from './invoices.schema';

type BulkInput = z.infer<typeof bulkInvoiceSchema>;

const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const money = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`;

const STUDENT_FIELDS = 'id, user_id, student_code, program_id, gpa, status, users(full_name), classes(code, year_level), programs(name)';

/** Хамрах хүрээнээс идэвхтэй оюутнуудыг олно */
async function resolveStudents(scope: BulkInput['scope']) {
  let programIds: string[] | null = null;
  if (scope.kind === 'school') {
    const depts = await run(supabase.from('departments').select('id').or(`id.in.(${scope.ids.join(',')}),parent_id.in.(${scope.ids.join(',')})`));
    const deptIds = depts.map((d: any) => d.id);
    programIds = deptIds.length ? (await run(supabase.from('programs').select('id').in('department_id', deptIds))).map((p: any) => p.id) : [];
    if (!programIds?.length) return [];
  }

  const base = () => supabase.from('students').select(STUDENT_FIELDS).eq('status', 'active').limit(20000);
  let rows: any[] = [];
  if (scope.kind === 'all') rows = await run(base());
  else if (scope.kind === 'school') for (const part of chunk(programIds!, 200)) rows.push(...(await run(base().in('program_id', part))));
  else if (scope.kind === 'program') rows = await run(base().in('program_id', scope.ids));
  else if (scope.kind === 'class') rows = await run(base().in('class_id', scope.ids));
  else for (const part of chunk(scope.student_codes, 300)) rows.push(...(await run(base().in('student_code', part))));

  return rows.map((s) => ({
    student_id: s.id as string,
    user_id: s.user_id as string,
    student_code: s.student_code as string,
    student_name: (s.users?.full_name ?? '') as string,
    program_id: (s.program_id ?? null) as string | null,
    program_name: (s.programs?.name ?? null) as string | null,
    class_name: (s.classes?.code ?? null) as string | null,
    year_level: (s.classes?.year_level ?? null) as number | null,
    gpa: s.gpa === null || s.gpa === undefined ? null : Number(s.gpa),
  }));
}

/** Тухайн улирлын бүртгэлтэй кредит (per_credit горимд) */
async function creditsFor(studentIds: string[], semesterId: string) {
  const credits = new Map<string, number>();
  for (const part of chunk(studentIds, 300)) {
    const rows = await run(
      supabase.from('enrollments').select('student_id, courses!inner(semester_id, subjects(credit))').in('student_id', part).eq('courses.semester_id', semesterId).neq('status', 'dropped'),
    );
    rows.forEach((r: any) => credits.set(r.student_id, (credits.get(r.student_id) ?? 0) + Number(r.courses?.subjects?.credit ?? 0)));
  }
  return credits;
}

/** Урьдчилан тооцоолол — юу ч хадгалахгүй */
export async function preview(input: BulkInput) {
  const semesterId = input.semester_id ?? (await currentId());
  if (!semesterId) throw new HttpError(422, 'Идэвхтэй улирал олдсонгүй. Улирал сонгоно уу.');

  const students = await resolveStudents(input.scope);
  const ids = students.map((s) => s.student_id);
  const [rules, credits, existing] = await Promise.all([
    input.apply_rules ? activeRules() : Promise.resolve([]),
    input.mode === 'per_credit' ? creditsFor(ids, semesterId) : Promise.resolve(new Map<string, number>()),
    (async () => {
      const map = new Map<string, string>();
      for (const part of chunk(ids, 300)) {
        const rows = await run(supabase.from('invoices').select('student_id, invoice_number').in('student_id', part).eq('semester_id', semesterId).neq('status', 'cancelled'));
        rows.forEach((r: any) => map.set(r.student_id, r.invoice_number));
      }
      return map;
    })(),
  ]);

  const rows = students
    .map((s) => {
      const credit = credits.get(s.student_id) ?? 0;
      const tuition = input.mode === 'per_credit' ? Math.round(credit * input.amount) : Math.round(input.amount);
      const discount = applyRules(rules, s, tuition);
      const existingNo = existing.get(s.student_id) ?? null;
      const skipReason = input.skip_existing && existingNo ? 'existing' : tuition <= 0 ? 'no_credit' : null;
      return { ...s, credits: credit, tuition, discount: discount.amount, discount_note: discount.note, net: tuition - discount.amount, existing_invoice: existingNo, skip: skipReason };
    })
    .sort((a, b) => a.student_code.localeCompare(b.student_code));

  const included = rows.filter((r) => !r.skip);
  return {
    semester_id: semesterId,
    rows,
    totals: {
      students: rows.length,
      create: included.length,
      skipped: rows.length - included.length,
      tuition: included.reduce((s, r) => s + r.tuition, 0),
      discount: included.reduce((s, r) => s + r.discount, 0),
      net: included.reduce((s, r) => s + r.net, 0),
      with_discount: included.filter((r) => r.discount > 0).length,
    },
  };
}

/** Энэ оны дараагийн дугаарууд (INV-2026-00001 ...) */
async function nextNumbers(count: number) {
  const year = new Date().getFullYear();
  const { data } = await supabase.from('invoices').select('invoice_number').like('invoice_number', `INV-${year}-%`).order('invoice_number', { ascending: false }).limit(1);
  const last = Number(String(data?.[0]?.invoice_number ?? '').split('-')[2] ?? 0) || 0;
  return Array.from({ length: count }, (_, i) => `INV-${year}-${String(last + i + 1).padStart(5, '0')}`);
}

export async function create(input: BulkInput, actor: AuthUser) {
  const pre = await preview(input);
  const rows = pre.rows.filter((r) => !r.skip);
  if (!rows.length) throw new HttpError(422, 'Нэхэмжлэл үүсгэх оюутан алга (бүгд алгасагдсан).');
  if (rows.length > 5000) throw new HttpError(422, 'Нэг удаад 5,000-аас ихгүй нэхэмжлэл үүсгэнэ.');

  const numbers = await nextNumbers(rows.length);
  let created = 0;
  for (const [ci, part] of chunk(rows, 300).entries()) {
    const payload: Record<string, unknown>[] = part.map((r, i) => ({
      student_id: r.student_id,
      semester_id: pre.semester_id,
      invoice_number: numbers[ci * 300 + i],
      tuition_amount: r.tuition,
      discount_amount: r.discount,
      discount_note: r.discount_note,
      net_amount: r.net,
      paid_amount: 0,
      status: 'pending',
      due_date: input.due_date ?? null,
      description: input.description ?? null,
    }));
    let { error } = await supabase.from('invoices').insert(payload);
    // net_amount нь generated column бол хасаж дахин оролдоно
    if (error?.code === '428C9') {
      payload.forEach((p) => delete p.net_amount);
      ({ error } = await supabase.from('invoices').insert(payload));
    }
    if (error) throw toHttpError(error);
    created += part.length;
  }

  // Оюутнуудад мэдэгдэл (push)
  const due = input.due_date ? `, төлөх хугацаа ${input.due_date}` : '';
  void notifyMany(
    rows.map((r) => ({ userId: r.user_id, title: 'Шинэ нэхэмжлэл', message: `Сургалтын төлбөр: ${money(r.net)}${r.discount ? ` (хөнгөлөлт ${money(r.discount)})` : ''}${due}.` })),
    'finance',
    actor.id,
  );
  return { created, skipped: pre.totals.skipped, total_net: pre.totals.net, total_discount: pre.totals.discount };
}
