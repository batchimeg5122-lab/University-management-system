import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { syncInvoice } from '../invoices/invoices.service';
import { notifyMany } from '../notifications/notifications.service';
import type { bulkPaymentsSchema, reconcilePreviewSchema } from './payments.schema';

type Status = 'matched' | 'overpaid' | 'duplicate' | 'unmatched' | 'ambiguous' | 'no_invoice' | 'skip';

const INV_RE = /INV-\d{4}-\d{3,6}/g;
const money = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`;

/** Банкны огноог (2026.09.21, 21/09/2026, Excel serial ...) ISO болгоно */
export function parseDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  let m = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).toISOString();
  m = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/.exec(s);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12).toISOString();
  if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(Math.round((Number(s) - 25569) * 86_400_000)).toISOString(); // Excel serial
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Хуулгын мөр бүрийг нэхэмжлэлтэй тулгана:
 * 1) Гүйлгээний утгаас нэхэмжлэлийн дугаар (INV-2026-00012) → шууд
 * 2) Оюутны код → тухайн оюутны хамгийн хуучин төлөгдөөгүй нэхэмжлэл
 * 3) Гүйлгээний дугаар өмнө бүртгэгдсэн бол → давхардал
 */
export async function preview(input: z.infer<typeof reconcilePreviewSchema>) {
  const [students, openInvoices, refs] = await Promise.all([
    run(supabase.from('students').select('id, student_code, users(full_name)').limit(50000)),
    run(
      supabase
        .from('invoices')
        .select('id, invoice_number, student_id, net_amount, tuition_amount, discount_amount, paid_amount, due_date, created_at, semesters(academic_year, name)')
        .in('status', ['pending', 'partial', 'overdue'])
        .limit(50000),
    ),
    (async () => {
      const set = new Set<string>();
      const refsIn = input.rows.map((r) => r.reference).filter(Boolean) as string[];
      for (let i = 0; i < refsIn.length; i += 300) {
        const rows = await run(supabase.from('payments').select('transaction_reference').in('transaction_reference', refsIn.slice(i, i + 300)));
        rows.forEach((r: any) => set.add(String(r.transaction_reference)));
      }
      return set;
    })(),
  ]);

  const byCode = new Map<string, { id: string; code: string; name: string }>();
  students.forEach((s: any) => byCode.set(String(s.student_code).toUpperCase(), { id: s.id, code: s.student_code, name: s.users?.full_name ?? '' }));
  const byStudent = new Map<string, any[]>();
  const byNumber = new Map<string, any>();
  openInvoices.forEach((inv: any) => {
    const balance = Math.max(0, Number(inv.net_amount ?? Number(inv.tuition_amount) - Number(inv.discount_amount)) - Number(inv.paid_amount));
    const row = { ...inv, balance };
    byNumber.set(String(inv.invoice_number).toUpperCase(), row);
    byStudent.set(inv.student_id, [...(byStudent.get(inv.student_id) ?? []), row]);
  });
  byStudent.forEach((list) => list.sort((a, b) => String(a.due_date ?? a.created_at).localeCompare(String(b.due_date ?? b.created_at))));
  const studentById = new Map([...byCode.values()].map((s) => [s.id, s]));
  const codesWithSep = [...byCode.keys()].filter((c) => /[^A-Z0-9А-ЯӨҮЁ]/.test(c) && c.length >= 5);

  // Хуулга дотор нэг оюутанд хэд хэдэн гүйлгээ байвал үлдэгдлийг дараалан хасна
  const remaining = new Map<string, number>();
  const seenRefs = new Set<string>();

  const rows = input.rows.map((r) => {
    const base = { ...r, payment_date: parseDate(r.date) };
    const out = (status: Status, extra: Record<string, unknown> = {}) => ({ ...base, status, ...extra });

    if (!(r.amount > 0)) return out('skip', { note: 'Орлого биш (зарлага эсвэл 0)' });
    if (r.reference && (refs.has(r.reference) || seenRefs.has(r.reference))) return out('duplicate', { note: 'Энэ гүйлгээ өмнө бүртгэгдсэн' });
    if (r.reference) seenRefs.add(r.reference);

    const text = ` ${r.description.toUpperCase()} `;
    let invoice: any = null;
    let student: { id: string; code: string; name: string } | undefined;

    const invNo = r.invoice_number || text.match(INV_RE)?.[0];
    if (invNo) {
      invoice = byNumber.get(invNo.toUpperCase()) ?? null;
      if (invoice) student = studentById.get(invoice.student_id);
    }

    if (!invoice) {
      if (r.student_code) student = byCode.get(r.student_code);
      else {
        const tokens = [...new Set(text.split(/[^A-Z0-9А-ЯӨҮЁ]+/).filter((t) => t.length >= 4))];
        let found = [...new Set(tokens.map((t) => byCode.get(t)).filter(Boolean).map((s) => s!.id))];
        // Код дотроо "-", "/" агуулдаг бол (ST-2026-001) шууд хайна
        if (!found.length) found = [...new Set(codesWithSep.filter((c) => text.includes(c)).map((c) => byCode.get(c)!.id))];
        if (found.length > 1) return out('ambiguous', { note: 'Гүйлгээний утгад хэд хэдэн оюутны код байна', candidates: found.map((id) => studentById.get(id)?.code) });
        student = found[0] ? studentById.get(found[0]) : undefined;
      }
      if (!student) return out('unmatched', { note: 'Оюутны код / нэхэмжлэлийн дугаар олдсонгүй' });
      const open = (byStudent.get(student.id) ?? []).filter((i) => (remaining.get(i.id) ?? i.balance) > 0);
      invoice = open[0] ?? null;
      if (!invoice) return out('no_invoice', { student_code: student.code, student_name: student.name, note: 'Төлөгдөөгүй нэхэмжлэл алга' });
    }

    const balance = remaining.get(invoice.id) ?? invoice.balance;
    remaining.set(invoice.id, Math.max(0, balance - r.amount));
    return out(r.amount > balance ? 'overpaid' : 'matched', {
      student_code: student?.code,
      student_name: student?.name,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      semester_name: invoice.semesters ? `${invoice.semesters.academic_year} ${invoice.semesters.name}` : null,
      balance,
      note: r.amount > balance ? `Үлдэгдлээс ${money(r.amount - balance)} илүү` : null,
    });
  });

  const count = (s: Status) => rows.filter((r) => r.status === s).length;
  const ready = rows.filter((r) => r.status === 'matched' || r.status === 'overpaid');
  return {
    rows,
    summary: {
      total: rows.length,
      matched: count('matched'),
      overpaid: count('overpaid'),
      duplicate: count('duplicate'),
      unmatched: count('unmatched') + count('ambiguous') + count('no_invoice'),
      skipped: count('skip'),
      ready_amount: ready.reduce((s, r) => s + r.amount, 0),
    },
  };
}

/** Тулгасан мөрүүдийг төлөлт болгон бүртгэнэ (давхардлыг дахин шалгана) */
export async function createBulk(input: z.infer<typeof bulkPaymentsSchema>, actor: AuthUser) {
  const refs = input.rows.map((r) => r.transaction_reference).filter(Boolean) as string[];
  const existing = new Set<string>();
  for (let i = 0; i < refs.length; i += 300) {
    (await run(supabase.from('payments').select('transaction_reference').in('transaction_reference', refs.slice(i, i + 300)))).forEach((r: any) => existing.add(r.transaction_reference));
  }

  const invoiceIds = [...new Set(input.rows.map((r) => r.invoice_id))];
  const invoices = new Map<string, any>();
  for (let i = 0; i < invoiceIds.length; i += 300) {
    (await run(supabase.from('invoices').select('id, student_id, status, students(user_id)').in('id', invoiceIds.slice(i, i + 300)))).forEach((inv: any) => invoices.set(inv.id, inv));
  }

  let created = 0;
  let duplicates = 0;
  const errors: { invoice_id: string; message: string }[] = [];
  const touched = new Set<string>();
  const notify = new Map<string, number>();

  for (const r of input.rows) {
    const inv = invoices.get(r.invoice_id);
    if (!inv) {
      errors.push({ invoice_id: r.invoice_id, message: 'Нэхэмжлэл олдсонгүй' });
      continue;
    }
    if (inv.status === 'cancelled') {
      errors.push({ invoice_id: r.invoice_id, message: 'Цуцалсан нэхэмжлэл' });
      continue;
    }
    if (r.transaction_reference && existing.has(r.transaction_reference)) {
      duplicates++;
      continue;
    }
    const { error } = await supabase.from('payments').insert({
      invoice_id: inv.id,
      student_id: inv.student_id,
      amount: r.amount,
      method: 'bank_transfer',
      transaction_reference: r.transaction_reference ?? null,
      description: r.description ?? 'Банкны хуулгаас',
      payment_date: r.payment_date ?? new Date().toISOString(),
    });
    if (error) {
      errors.push({ invoice_id: r.invoice_id, message: error.message });
      continue;
    }
    if (r.transaction_reference) existing.add(r.transaction_reference);
    created++;
    touched.add(inv.id);
    const userId = inv.students?.user_id;
    if (userId) notify.set(userId, (notify.get(userId) ?? 0) + r.amount);
  }

  for (const id of touched) await syncInvoice(id);
  void notifyMany(
    [...notify.entries()].map(([userId, amount]) => ({ userId, title: 'Төлбөр хүлээн авлаа', message: `${money(amount)} төлбөр амжилттай бүртгэгдлээ.` })),
    'finance',
    actor.id,
  );
  return { created, duplicates, errors, invoices_updated: touched.size };
}
