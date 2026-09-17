import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { conflict } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { conflictMessage, findAllConflicts, findConflicts, type SlotEntry } from '../../utils/timetable';
import { currentId } from '../semesters/semesters.service';
import type { createScheduleSchema, listSchedulesQuery, updateScheduleSchema } from './schedules.schema';

const SELECT = '*, courses!inner(semester_id, class_id, teacher_id, subjects(code,name), classes(code), employees(users(full_name)))';
const NO_MATCH = '00000000-0000-0000-0000-000000000000';

export type ScheduleRow = SlotEntry & {
  id: string;
  semester_id: string;
  subject_code?: string;
  subject_name?: string;
  teacher_name: string | null;
  class_name: string | null;
};

const mapSchedule = ({ courses, ...r }: any): ScheduleRow => ({
  ...r,
  semester_id: courses?.semester_id,
  class_id: courses?.class_id ?? null,
  teacher_id: courses?.teacher_id ?? null,
  subject_code: courses?.subjects?.code,
  subject_name: courses?.subjects?.name,
  teacher_name: courses?.employees?.users?.full_name ?? null,
  class_name: courses?.classes?.code ?? null,
});

const sortRows = (rows: ScheduleRow[]) =>
  rows.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time) || (a.class_name ?? '').localeCompare(b.class_name ?? ''));

async function semesterRows(semesterId: string, day?: number) {
  let q = supabase.from('schedules').select(SELECT).eq('courses.semester_id', semesterId);
  if (day) q = q.eq('day_of_week', day);
  return (await run(q)).map(mapSchedule);
}

/**
 * Хуваарийн жагсаалт.
 * - Багш: ҮРГЭЛЖ зөвхөн өөрийн хичээлийн цаг (query-ээр тойрох боломжгүй)
 * - Оюутан: зөвхөн бүртгэлтэй хичээлийн цаг
 * - Сургалтын алба, удирдлага, админ: сургуулийн нэгдсэн хуваарь (анги/багш/өрөөгөөр шүүнэ)
 */
export async function list(q: z.infer<typeof listSchedulesQuery>, actor: AuthUser) {
  const semester = q.semester_id || (await currentId());
  let query = supabase.from('schedules').select(SELECT);
  if (semester) query = query.eq('courses.semester_id', semester);
  if (q.course_id) query = query.eq('course_id', q.course_id);
  if (q.class_id) query = query.eq('courses.class_id', q.class_id);

  if (actor.role === 'teacher') {
    query = query.eq('courses.teacher_id', actor.employeeId ?? NO_MATCH);
  } else if (actor.role === 'student') {
    const rows = await run(supabase.from('enrollments').select('course_id').eq('student_id', actor.studentId ?? NO_MATCH));
    query = query.in('course_id', rows.length ? rows.map((r) => r.course_id) : [NO_MATCH]);
  } else if (q.teacher_id) {
    query = query.eq('courses.teacher_id', q.teacher_id);
  }

  let rows = (await run(query)).map(mapSchedule);
  if (q.room && actor.role !== 'teacher' && actor.role !== 'student') {
    const room = q.room.trim().toLowerCase();
    rows = rows.filter((r) => (r.room ?? '').trim().toLowerCase() === room);
  }
  return sortRows(rows);
}

/** Анги, багш, өрөөний давхцлыг шалгаж, байвал 409 шиднэ */
async function assertFree(candidate: SlotEntry & { semester_id: string }) {
  const others = await semesterRows(candidate.semester_id, candidate.day_of_week);
  const [first] = findConflicts(candidate, others);
  if (first) throw conflict(conflictMessage(first.kind, first.with));
}

async function courseInfo(courseId: string) {
  return run(supabase.from('courses').select('id, semester_id, class_id, teacher_id').eq('id', courseId).single());
}

const normalizeTime = (t: string) => `${t.slice(0, 5)}:00`;

export async function create(input: z.infer<typeof createScheduleSchema>) {
  const course = await courseInfo(input.course_id);
  const row = {
    course_id: input.course_id,
    day_of_week: input.day_of_week,
    start_time: normalizeTime(input.start_time),
    end_time: normalizeTime(input.end_time),
    building: input.building || null,
    room: input.room,
  };
  await assertFree({ ...row, class_id: course.class_id, teacher_id: course.teacher_id, semester_id: course.semester_id });
  return mapSchedule(await run(supabase.from('schedules').insert(row).select(SELECT).single()));
}

/** Цагийг өөр гараг/цаг/өрөө рүү зөөх */
export async function update(id: string, input: z.infer<typeof updateScheduleSchema>) {
  const current = required(await run(supabase.from('schedules').select('*').eq('id', id)), 'Хуваарь олдсонгүй.')[0];
  const merged = {
    course_id: input.course_id ?? current.course_id,
    day_of_week: input.day_of_week ?? current.day_of_week,
    start_time: normalizeTime(input.start_time ?? current.start_time),
    end_time: normalizeTime(input.end_time ?? current.end_time),
    building: input.building !== undefined ? input.building || null : current.building,
    room: input.room ?? current.room,
  };
  const course = await courseInfo(merged.course_id);
  await assertFree({ id, ...merged, class_id: course.class_id, teacher_id: course.teacher_id, semester_id: course.semester_id });
  required(await run(supabase.from('schedules').update(merged).eq('id', id).select('id')), 'Хуваарь олдсонгүй.');
  return mapSchedule(await run(supabase.from('schedules').select(SELECT).eq('id', id).single()));
}

export async function remove(id: string) {
  required(await run(supabase.from('schedules').delete().eq('id', id).select('id')), 'Хуваарь олдсонгүй.');
  return { deleted: true };
}

/** Одоо байгаа хуваарь доторх давхцлууд (trigger-ээс өмнө орсон өгөгдөл) */
export async function conflicts(semesterId?: string) {
  const semester = semesterId || (await currentId());
  if (!semester) return [];
  return findAllConflicts(await semesterRows(semester)).map((p) => ({ kind: p.kind, a: p.a, b: p.b }));
}

/**
 * Хичээлийн багш эсвэл ангийг солиход тухайн хичээлийн бүх цаг
 * шинэ багш/ангийн бусад хичээлтэй давхцахгүй эсэхийг шалгана.
 */
export async function assertCourseReassignFree(courseId: string, next: { teacher_id?: string | null; class_id?: string | null }) {
  const course = await courseInfo(courseId);
  const own = (await run(supabase.from('schedules').select('*').eq('course_id', courseId))) as any[];
  if (!own.length) return;

  const others = (await semesterRows(course.semester_id)).filter((r) => r.course_id !== courseId);
  const teacher_id = next.teacher_id !== undefined ? next.teacher_id : course.teacher_id;
  const class_id = next.class_id !== undefined ? next.class_id : course.class_id;

  for (const s of own) {
    // Өрөө өөрчлөгдөхгүй тул зөвхөн анги, багшийг шалгана
    const [first] = findConflicts({ ...s, room: null, class_id, teacher_id }, others);
    if (first) throw conflict(`Хичээлийн цагтай давхцаж байна: ${conflictMessage(first.kind, first.with)}`);
  }
}
