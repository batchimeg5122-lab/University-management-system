import { supabase } from '../../config/supabase';
import { run } from '../../utils/api-response';
import { ilike } from '../../utils/pagination';

/**
 * Оюутны "view" мэдээллийг v_students-ээс биш, үндсэн хүснэгтүүдээс JOIN хийж үүсгэнэ.
 * Шалтгаан: DB дээрх v_students view-д class_id, program_id, user_id баганууд байхгүй.
 * Ингэснээр view-ийн бүтэц өөрчлөгдсөн ч API эвдрэхгүй.
 */
export const STUDENT_SELECT =
  '*, users(last_name, first_name, full_name, email, phone), classes(code), programs(name, departments(name))';

export const mapStudent = ({ users, classes, programs, ...s }: any) => ({
  ...s,
  gpa: s.gpa !== null && s.gpa !== undefined ? Number(s.gpa) : null,
  earned_credits: Number(s.earned_credits ?? 0),
  last_name: users?.last_name ?? '',
  first_name: users?.first_name ?? '',
  full_name: users?.full_name ?? `${users?.last_name ?? ''} ${users?.first_name ?? ''}`.trim(),
  email: users?.email ?? null,
  phone: users?.phone ?? null,
  class_name: classes?.code ?? null,
  program_name: programs?.name ?? null,
  department_name: programs?.departments?.name ?? null,
});

export async function getStudentView(id: string) {
  return mapStudent(await run(supabase.from('students').select(STUDENT_SELECT).eq('id', id).single()));
}

export async function findStudentViewByUser(userId: string) {
  const row = await run(supabase.from('students').select(STUDENT_SELECT).eq('user_id', userId).maybeSingle());
  return row ? mapStudent(row) : null;
}

/**
 * Нэр/и-мэйл (users хүснэгтэд) эсвэл код/регистр (students хүснэгтэд)-ээр хайх
 * PostgREST `or` шүүлтүүрийг үүсгэнэ.
 */
export async function studentSearchFilter(q: string) {
  const like = ilike(q);
  const users = await run(
    supabase.from('users').select('id').eq('role', 'student').or(`full_name.ilike.${like},email.ilike.${like}`).limit(300),
  );
  const parts = [`student_code.ilike.${like}`, `register_number.ilike.${like}`];
  if (users.length) parts.push(`user_id.in.(${users.map((u: { id: string }) => u.id).join(',')})`);
  return parts.join(',');
}
