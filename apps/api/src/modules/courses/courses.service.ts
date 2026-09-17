import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { conflict } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { DEFAULT_GRADE_ITEMS } from '../../utils/constants';
import { notifyUsers } from '../notifications/notifications.service';
import { assertCourseReassignFree } from '../schedules/schedules.service';
import type { createCourseSchema, listCoursesQuery, updateCourseSchema } from './courses.schema';

export const COURSE_SELECT =
  '*, subjects(code,name,credit,subject_type), semesters(academic_year,name), classes(code), employees(user_id, users(full_name)), enrollments(count)';

export const mapCourse = ({ subjects, semesters, classes, employees, enrollments, ...r }: any) => ({
  ...r,
  subject_code: subjects?.code,
  subject_name: subjects?.name,
  credit: subjects?.credit,
  teacher_name: employees?.users?.full_name ?? null,
  class_name: classes?.code ?? null,
  semester_name: semesters ? `${semesters.academic_year} ${semesters.name}` : undefined,
  student_count: enrollments?.[0]?.count ?? 0,
});

export async function list(q: z.infer<typeof listCoursesQuery>, actor: AuthUser) {
  let query = supabase.from('courses').select(COURSE_SELECT);
  if (q.semester_id) query = query.eq('semester_id', q.semester_id);
  if (q.class_id) query = query.eq('class_id', q.class_id);
  if (q.teacher_id) query = query.eq('teacher_id', q.teacher_id);

  // Багш, оюутан зөвхөн өөрт хамаатай хичээлээ харна
  if (q.mine === 'true' || actor.role === 'teacher' || actor.role === 'student') {
    if (actor.role === 'teacher') query = query.eq('teacher_id', actor.employeeId ?? '00000000-0000-0000-0000-000000000000');
    if (actor.role === 'student') {
      const rows = await run(supabase.from('enrollments').select('course_id').eq('student_id', actor.studentId ?? ''));
      query = query.in('id', rows.map((r) => r.course_id));
    }
  }
  return (await run(query)).map(mapCourse);
}

export async function detail(id: string) {
  return mapCourse(await run(supabase.from('courses').select(COURSE_SELECT).eq('id', id).single()));
}

export async function create(input: z.infer<typeof createCourseSchema>, actor: AuthUser) {
  const cls = await run(supabase.from('classes').select('id, code').eq('id', input.class_id).single());
  const section = input.section || cls.code;

  const dup = await run(supabase.from('courses').select('id').eq('subject_id', input.subject_id).eq('semester_id', input.semester_id).eq('section', section));
  if (dup.length) throw conflict('Энэ улиралд уг хичээл энэ ангид аль хэдийн хуваарилагдсан байна.');

  const course = await run(
    supabase
      .from('courses')
      .insert({ subject_id: input.subject_id, semester_id: input.semester_id, class_id: cls.id, teacher_id: input.teacher_id ?? null, section, max_students: input.max_students ?? 40, status: 'planned' })
      .select('id')
      .single(),
  );

  await run(
    supabase
      .from('grade_items')
      .insert(DEFAULT_GRADE_ITEMS.map(([name, max], i) => ({ course_id: course.id, name, max_score: max, weight: max, sort_order: i + 1 })))
      .select('id'),
  );

  // Ангийн идэвхтэй оюутнуудыг автоматаар бүртгэнэ
  const students = await run(supabase.from('students').select('id').eq('class_id', cls.id).eq('status', 'active'));
  if (students.length) {
    await run(
      supabase
        .from('enrollments')
        .insert(students.map((s) => ({ course_id: course.id, student_id: s.id, status: 'enrolled', scores: {}, grade_status: 'draft' })))
        .select('id'),
    );
  }

  const created = await detail(course.id);
  if (input.teacher_id) await notifyTeacher(input.teacher_id, created, actor);
  return created;
}

export async function update(id: string, input: z.infer<typeof updateCourseSchema>, actor: AuthUser) {
  const before = required(await run(supabase.from('courses').select('teacher_id').eq('id', id)), 'Хичээл олдсонгүй.')[0];
  // Шинэ багш хичээлийн хуваарийн цагт өөр хичээлтэй бол хориглоно
  if (input.teacher_id !== undefined && input.teacher_id !== before.teacher_id) {
    await assertCourseReassignFree(id, { teacher_id: input.teacher_id });
  }
  await run(supabase.from('courses').update(input).eq('id', id).select('id'));
  const updated = await detail(id);
  if (input.teacher_id && input.teacher_id !== before.teacher_id) await notifyTeacher(input.teacher_id, updated, actor);
  return updated;
}

async function notifyTeacher(employeeId: string, course: ReturnType<typeof mapCourse>, actor: AuthUser) {
  const emp = await run(supabase.from('employees').select('user_id').eq('id', employeeId).maybeSingle());
  if (emp?.user_id) {
    await notifyUsers([emp.user_id], 'Шинэ хичээл оноогдлоо', `${course.subject_name} хичээлийг ${course.class_name} ангид заахаар оноолоо.`, 'schedule', actor.id);
  }
}
