import type { z } from 'zod';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import { conflict, forbidden } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { attendanceRate } from '../../utils/gpa';
import { ENROLLMENT_SELECT, mapEnrollment } from '../enrollments/enrollments.service';
import { INVOICE_SELECT, mapInvoice } from '../invoices/invoices.service';
import { createAuthUser } from '../users/users.service';
import type { createStudentSchema, listStudentsQuery, updateStudentSchema } from './students.schema';
import { STUDENT_SELECT, getStudentView, mapStudent, studentSearchFilter } from './students.view';

export async function list(q: z.infer<typeof listStudentsQuery>) {
  let query = supabase.from('students').select(STUDENT_SELECT).order('student_code').limit(2000);
  if (q.status) query = query.eq('status', q.status);
  if (q.class_id) query = query.eq('class_id', q.class_id);
  if (q.program_id) query = query.eq('program_id', q.program_id);
  if (q.q) query = query.or(await studentSearchFilter(q.q));
  return (await run(query)).map(mapStudent);
}

export async function detail(id: string, actor: AuthUser) {
  if (actor.role === 'student' && actor.studentId !== id) throw forbidden('Та зөвхөн өөрийн мэдээллийг харах боломжтой.');
  if (actor.role === 'teacher') throw forbidden();
  const [student, enrollments, invoices, attendance] = await Promise.all([
    getStudentView(id),
    run(supabase.from('enrollments').select(ENROLLMENT_SELECT).eq('student_id', id)),
    run(supabase.from('invoices').select(INVOICE_SELECT).eq('student_id', id).order('created_at', { ascending: false })),
    run(supabase.from('attendance').select('status').eq('student_id', id)),
  ]);
  return {
    student,
    enrollments: enrollments.map(mapEnrollment),
    invoices: invoices.map(mapInvoice),
    attendance_rate: attendanceRate(attendance),
  };
}

export async function create(input: z.infer<typeof createStudentSchema>) {
  const exists = await run(supabase.from('students').select('id').eq('student_code', input.student_code));
  if (exists.length) throw conflict('Оюутны код давхцаж байна.');
  const cls = await run(supabase.from('classes').select('id, program_id').eq('id', input.class_id).single());

  // И-мэйлгүй бол оюутны кодоор нэвтрэх хаяг үүсгэнэ (оюутны кодоор нэвтрэхэд /auth/lookup олно)
  const email = (input.email || `${input.student_code.toLowerCase()}@${env.STUDENT_EMAIL_DOMAIN}`).toLowerCase();
  const user = await createAuthUser({ ...input, email, role: 'student' });
  const { data: student, error } = await supabase
    .from('students')
    .insert({
      user_id: user.id,
      student_code: input.student_code,
      register_number: input.register_number,
      class_id: cls.id,
      program_id: cls.program_id,
      enrollment_year: input.enrollment_year ?? new Date().getFullYear(),
      status: 'active',
    })
    .select('id')
    .single();
  if (error) {
    await supabase.from('users').delete().eq('id', user.id);
    await supabase.auth.admin.deleteUser(user.id);
    throw conflict(`Оюутан бүртгэж чадсангүй: ${error.message}`);
  }
  const view = await getStudentView(student.id);
  return { ...view, initial_password: user.initial_password };
}

export async function update(id: string, input: z.infer<typeof updateStudentSchema>) {
  const current = required(await run(supabase.from('students').select('user_id').eq('id', id)), 'Оюутан олдсонгүй.')[0];
  const { last_name, first_name, phone, ...studentFields } = input;
  const patch: Record<string, unknown> = { ...studentFields };
  if (input.class_id) {
    const cls = await run(supabase.from('classes').select('program_id').eq('id', input.class_id).single());
    patch.program_id = cls.program_id;
  }
  if (Object.keys(patch).length) await run(supabase.from('students').update(patch).eq('id', id).select('id'));
  const userPatch = Object.fromEntries(Object.entries({ last_name, first_name, phone }).filter(([, v]) => v !== undefined));
  if (Object.keys(userPatch).length) await run(supabase.from('users').update(userPatch).eq('id', current.user_id).select('id'));
  return getStudentView(id);
}
