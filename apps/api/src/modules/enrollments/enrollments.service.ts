import { supabase } from '../../config/supabase';
import { run } from '../../utils/api-response';

export const ENROLLMENT_SELECT =
  '*, students(student_code, user_id, users(full_name)), courses(subjects(code,name,credit), semesters(academic_year,name), classes(code), employees(users(full_name)))';

export const mapEnrollment = ({ students, courses, ...r }: any) => ({
  ...r,
  scores: r.scores ?? {},
  student_code: students?.student_code,
  student_name: students?.users?.full_name,
  subject_code: courses?.subjects?.code,
  subject_name: courses?.subjects?.name,
  credit: courses?.subjects?.credit,
  teacher_name: courses?.employees?.users?.full_name ?? null,
  class_name: courses?.classes?.code ?? null,
  semester_name: courses?.semesters ? `${courses.semesters.academic_year} ${courses.semesters.name}` : undefined,
});

export async function listByCourse(courseId: string) {
  const rows = await run(supabase.from('enrollments').select(ENROLLMENT_SELECT).eq('course_id', courseId));
  return rows.map(mapEnrollment).sort((a, b) => (a.student_name ?? '').localeCompare(b.student_name ?? ''));
}

/** Анги гадуурх оюутныг (сонгон хичээл) нэмэх */
export async function add(courseId: string, studentIds: string[]) {
  const existing = await run(supabase.from('enrollments').select('student_id').eq('course_id', courseId));
  const have = new Set(existing.map((e) => e.student_id));
  const rows = studentIds.filter((id) => !have.has(id)).map((student_id) => ({ course_id: courseId, student_id, status: 'enrolled', scores: {}, grade_status: 'draft' }));
  if (rows.length) await run(supabase.from('enrollments').insert(rows).select('id'));
  return { added: rows.length };
}
