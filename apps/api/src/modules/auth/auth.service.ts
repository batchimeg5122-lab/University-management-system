import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { getEmployeeView } from '../employees/employees.view';
import { getStudentView } from '../students/students.view';

export async function getSession(user: AuthUser) {
  const [row, student, employee] = await Promise.all([
    run(supabase.from('users').select('*').eq('id', user.id).single()),
    user.studentId ? getStudentView(user.studentId) : null,
    user.employeeId ? getEmployeeView(user.employeeId) : null,
  ]);
  return { user: row, student: student ?? null, employee: employee ?? null };
}

/** Оюутны код / ажилтны кодоор нэвтрэх и-мэйлийг олно */
export async function lookupEmail(identifier: string) {
  const code = identifier.toUpperCase();
  const { data: student } = await supabase.from('students').select('users(email)').eq('student_code', code).maybeSingle();
  const { data: employee } = student ? { data: null } : await supabase.from('employees').select('users(email)').eq('employee_code', code).maybeSingle();
  const email = (student as any)?.users?.email ?? (employee as any)?.users?.email;
  // Бүртгэлтэй эсэхийг задруулахгүйн тулд ерөнхий мессеж
  if (!email) throw new HttpError(401, 'Код эсвэл нууц үг буруу байна.');
  return { email };
}
