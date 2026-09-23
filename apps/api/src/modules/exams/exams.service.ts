import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { forbidden, HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { localDate } from '../../utils/local-date';
import { notifyCourseStudents, notifyUsers } from '../notifications/notifications.service';
import { currentId } from '../semesters/semesters.service';
import type { createExamSchema, listExamsQuery, updateExamSchema } from './exams.schema';

const SELECT = '*, courses!inner(semester_id, teacher_id, class_id, subjects(code, name), classes(code), employees(user_id, users(full_name)))';
const NO_MATCH = '00000000-0000-0000-0000-000000000000';

export const EXAM_TYPE_LABEL: Record<string, string> = { quiz: 'Сорил', midterm: 'Дунд шалгалт', final: 'Эцсийн шалгалт', retake: 'Нөхөн шалгалт', other: 'Шалгалт' };

const map = ({ courses, ...e }: any) => ({
  ...e,
  start_time: String(e.start_time).slice(0, 5),
  end_time: String(e.end_time).slice(0, 5),
  semester_id: courses?.semester_id,
  class_id: courses?.class_id ?? null,
  teacher_id: courses?.teacher_id ?? null,
  subject_code: courses?.subjects?.code,
  subject_name: courses?.subjects?.name,
  class_name: courses?.classes?.code ?? null,
  teacher_name: courses?.employees?.users?.full_name ?? null,
});

/** Оюутан: бүртгэлтэй хичээл, Багш: өөрийн хичээл, Алба: бүгд (одоогийн улирал) */
export async function list(q: z.infer<typeof listExamsQuery>, actor: AuthUser) {
  let query = supabase.from('exams').select(SELECT).order('exam_date').order('start_time');
  if (q.course_id) query = query.eq('course_id', q.course_id);
  if (q.upcoming === 'true') query = query.gte('exam_date', localDate());
  else if (q.from) query = query.gte('exam_date', q.from);

  if (actor.role === 'student') {
    const rows = await run(supabase.from('enrollments').select('course_id').eq('student_id', actor.studentId ?? NO_MATCH).neq('status', 'dropped'));
    query = query.in('course_id', rows.length ? rows.map((r: any) => r.course_id) : [NO_MATCH]);
  } else if (actor.role === 'teacher') {
    query = query.eq('courses.teacher_id', actor.employeeId ?? NO_MATCH);
  } else {
    const semester = q.semester_id || (q.course_id ? null : await currentId());
    if (semester) query = query.eq('courses.semester_id', semester);
  }
  return (await run(query)).map(map);
}

async function assertCanManage(courseId: string, actor: AuthUser) {
  if (['super_admin', 'academic'].includes(actor.role)) return;
  if (actor.role === 'teacher') {
    const c = await run(supabase.from('courses').select('teacher_id').eq('id', courseId).maybeSingle());
    if (c?.teacher_id === actor.employeeId) return;
  }
  throw forbidden('Зөвхөн Сургалтын алба эсвэл хичээлийн багш шалгалт товлоно.');
}

const place = (e: any) => (e.is_online ? 'Онлайн' : [e.building, e.room].filter(Boolean).join(' ') || 'Өрөө тодорхойгүй');

async function announce(exam: any, title: string) {
  const msg = `${exam.subject_name}: ${EXAM_TYPE_LABEL[exam.exam_type] ?? 'Шалгалт'} — ${exam.exam_date} ${exam.start_time}, ${place(exam)}`;
  await notifyCourseStudents([exam.course_id], title, msg, 'schedule', null, { kind: 'exam', exam_id: exam.id });
  if (exam.teacher_id) {
    const emp = await run(supabase.from('employees').select('user_id').eq('id', exam.teacher_id).maybeSingle());
    if (emp?.user_id) await notifyUsers([emp.user_id], title, msg, 'schedule', null, { kind: 'exam', exam_id: exam.id, course_id: exam.course_id });
  }
}

export async function create(input: z.infer<typeof createExamSchema>, actor: AuthUser) {
  await assertCanManage(input.course_id, actor);
  const row = await run(
    supabase
      .from('exams')
      .insert({ ...input, title: input.title || null, created_by: actor.id, ...(input.is_online ? { room: null, building: null } : {}) })
      .select(SELECT)
      .single(),
  );
  const exam = map({ ...row, title: row.title ?? EXAM_TYPE_LABEL[row.exam_type] });
  if (!row.title) await supabase.from('exams').update({ title: exam.title }).eq('id', exam.id);
  void announce(exam, 'Шалгалт товлогдлоо');
  return exam;
}

export async function update(id: string, input: z.infer<typeof updateExamSchema>, actor: AuthUser) {
  const current = required(await run(supabase.from('exams').select('*').eq('id', id)), 'Шалгалт олдсонгүй.')[0];
  await assertCanManage(current.course_id, actor);
  const next = { ...current, ...input };
  if (String(next.end_time).slice(0, 5) <= String(next.start_time).slice(0, 5)) throw new HttpError(422, 'Дуусах цаг эхлэх цагаас хойш байна.');
  const row = await run(
    supabase
      .from('exams')
      .update({ ...input, ...(next.is_online ? { room: null, building: null } : {}), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT)
      .single(),
  );
  const exam = map(row);
  const changed = ['exam_date', 'start_time', 'end_time', 'room', 'building', 'is_online'].some((k) => String(current[k] ?? '').slice(0, 5) !== String(row[k] ?? '').slice(0, 5));
  if (changed) void announce(exam, 'Шалгалтын хуваарь өөрчлөгдлөө');
  return exam;
}

export async function remove(id: string, actor: AuthUser) {
  const current = required(await run(supabase.from('exams').select(SELECT).eq('id', id)), 'Шалгалт олдсонгүй.')[0];
  await assertCanManage(current.course_id, actor);
  await run(supabase.from('exams').delete().eq('id', id).select('id'));
  const exam = map(current);
  if (exam.exam_date >= localDate()) void notifyCourseStudents([exam.course_id], 'Шалгалт цуцлагдлаа', `${exam.subject_name}: ${exam.exam_date} ${exam.start_time}-ийн шалгалт цуцлагдлаа.`, 'schedule', null, { kind: 'exam' });
  return { deleted: true };
}
