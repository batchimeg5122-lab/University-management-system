import { randomInt } from 'node:crypto';
import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { forbidden, notFound, unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { getStudentView } from '../students/students.view';
import type { createCertificateSchema, listCertificatesQuery } from './certificates.schema';

const SELECT = '*, students(student_code, users(full_name))';

const mapCertificate = ({ students, ...c }: any) => ({
  ...c,
  student_code: students?.student_code ?? c.snapshot?.student_code,
  student_name: students?.users?.full_name ?? c.snapshot?.full_name,
  is_valid: !c.revoked_at && (!c.valid_until || c.valid_until >= new Date().toISOString().slice(0, 10)),
});

/** Андуурч уншихааргүй тэмдэгтүүдээр 8 оронтой код */
function verifyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join('');
}

async function nextNumber() {
  const year = new Date().getFullYear();
  const { count } = await supabase.from('student_certificates').select('id', { count: 'exact', head: true });
  return `ТОД-${year}-${String((count ?? 0) + 1).padStart(5, '0')}`;
}

/** Оюутан өөрөө тодорхойлолт авна */
export async function create(actor: AuthUser, input: z.infer<typeof createCertificateSchema>) {
  if (!actor.studentId) throw forbidden('Зөвхөн оюутан тодорхойлолт авна.');
  const student = await getStudentView(actor.studentId);
  if (student.status !== 'active') {
    throw unprocessable('Суралцаж буй төлөвтэй оюутан тодорхойлолт авах боломжтой. Сургалтын албанд хандана уу.');
  }

  const [semester, enrollments] = await Promise.all([
    run(supabase.from('semesters').select('academic_year, name').eq('is_current', true).maybeSingle()),
    run(supabase.from('enrollments').select('id').eq('student_id', actor.studentId).neq('status', 'dropped')),
  ]);

  const yearLevel = student.enrollment_year ? Math.max(1, new Date().getFullYear() - Number(student.enrollment_year) + 1) : null;

  const snapshot = {
    full_name: student.full_name,
    last_name: student.last_name,
    first_name: student.first_name,
    student_code: student.student_code,
    register_number: student.register_number,
    program_name: student.program_name,
    department_name: student.department_name,
    class_name: student.class_name,
    year_level: yearLevel,
    enrollment_year: student.enrollment_year,
    status: student.status,
    semester: semester ? `${semester.academic_year} оны ${semester.name}` : null,
    course_count: enrollments.length,
    gpa: input.include_gpa ? student.gpa : null,
    earned_credits: input.include_gpa ? student.earned_credits : null,
  };

  const valid_until = new Date(Date.now() + input.valid_days * 86400000).toISOString().slice(0, 10);

  const row = await run(
    supabase
      .from('student_certificates')
      .insert({
        student_id: actor.studentId,
        number: await nextNumber(),
        verify_code: verifyCode(),
        purpose: input.purpose,
        purpose_note: input.purpose_note ?? null,
        include_gpa: input.include_gpa,
        snapshot,
        valid_until,
      })
      .select(SELECT)
      .single(),
  );
  return mapCertificate(row);
}

export async function mine(actor: AuthUser) {
  const rows = await run(
    supabase.from('student_certificates').select(SELECT).eq('student_id', actor.studentId ?? '').order('issued_at', { ascending: false }),
  );
  return rows.map(mapCertificate);
}

export async function detail(id: string, actor: AuthUser) {
  const row = required(await run(supabase.from('student_certificates').select(SELECT).eq('id', id)), 'Тодорхойлолт олдсонгүй.')[0];
  const isStaff = ['super_admin', 'academic', 'management'].includes(actor.role);
  if (!isStaff && row.student_id !== actor.studentId) throw forbidden('Хандах эрхгүй.');
  return mapCertificate(row);
}

/** Сургалтын албаны жагсаалт */
export async function list(q: z.infer<typeof listCertificatesQuery>) {
  let query = supabase.from('student_certificates').select(SELECT).order('issued_at', { ascending: false }).limit(500);
  if (q.student_id) query = query.eq('student_id', q.student_id);
  let rows = (await run(query)).map(mapCertificate);
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter((c: any) => [c.student_name, c.student_code, c.number, c.verify_code].some((v) => String(v ?? '').toLowerCase().includes(needle)));
  }
  return rows;
}

/** Хүчингүй болгох (сургалтын алба) */
export async function revoke(id: string, actor: AuthUser) {
  const rows = required(
    await run(supabase.from('student_certificates').update({ revoked_at: new Date().toISOString(), revoked_by: actor.id }).eq('id', id).select(SELECT)),
    'Тодорхойлолт олдсонгүй.',
  );
  return mapCertificate(rows[0]);
}

/** Нэвтрэхгүйгээр кодоор шалгах — зөвхөн хамгийн бага мэдээлэл */
export async function verify(code: string) {
  const row = await run(supabase.from('student_certificates').select('*').ilike('verify_code', code.trim()).maybeSingle());
  if (!row) throw notFound('Ийм кодтой тодорхойлолт олдсонгүй.');
  const isValid = !row.revoked_at && (!row.valid_until || row.valid_until >= new Date().toISOString().slice(0, 10));
  return {
    number: row.number,
    full_name: row.snapshot?.full_name ?? null,
    student_code: row.snapshot?.student_code ?? null,
    program_name: row.snapshot?.program_name ?? null,
    class_name: row.snapshot?.class_name ?? null,
    status: row.snapshot?.status ?? null,
    issued_at: row.issued_at,
    valid_until: row.valid_until,
    is_valid: isValid,
    revoked: !!row.revoked_at,
  };
}
