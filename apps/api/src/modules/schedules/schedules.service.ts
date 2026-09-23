import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { randomUUID } from 'node:crypto';
import { conflict, notFound, unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { TIME_SLOTS, WEEK_DAYS, conflictMessage, findAllConflicts, findConflicts, overlaps, type SlotEntry } from '../../utils/timetable';
import { currentId } from '../semesters/semesters.service';
import { notifyCourseStudents, notifyUsers } from '../notifications/notifications.service';
import type { createScheduleSchema, listSchedulesQuery, suggestionsQuery, updateScheduleSchema } from './schedules.schema';

const SELECT = '*, courses!inner(semester_id, class_id, teacher_id, subjects(code,name), classes(code), employees(users(full_name)), enrollments(count))';
const NO_MATCH = '00000000-0000-0000-0000-000000000000';

export type ScheduleRow = SlotEntry & {
  id: string;
  semester_id: string;
  student_count?: number;
  subject_code?: string;
  subject_name?: string;
  teacher_name: string | null;
  class_name: string | null;
};

const mapSchedule = ({ courses, ...r }: any): ScheduleRow => ({
  ...r,
  session_type: r.session_type ?? 'lecture',
  is_online: !!r.is_online,
  student_count: courses?.enrollments?.[0]?.count ?? 0,
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

async function courseInfo(courseId: string) {
  return run(supabase.from('courses').select('id, semester_id, class_id, teacher_id').eq('id', courseId).single());
}

const normalizeTime = (t: string) => `${t.slice(0, 5)}:00`;

export async function create(input: z.infer<typeof createScheduleSchema>) {
  const courseIds = [...new Set(input.course_ids)];
  const courses = await run(supabase.from('courses').select('id, semester_id, class_id, teacher_id').in('id', courseIds));
  if (courses.length !== courseIds.length) throw notFound('Зарим хичээл олдсонгүй.');

  const semesters = new Set(courses.map((c: any) => c.semester_id));
  if (semesters.size > 1) throw unprocessable('Нэгдсэн лекцийн хичээлүүд нэг улиралд байх ёстой.');
  const classes = courses.map((c: any) => c.class_id);
  if (new Set(classes).size !== classes.length) throw unprocessable('Нэг ангийг хоёр удаа сонгосон байна.');
  const teachers = new Set(courses.map((c: any) => c.teacher_id).filter(Boolean));
  if (courseIds.length > 1 && teachers.size > 1) throw unprocessable('Нэгдсэн лекцийг нэг багш заана. Хичээлүүдийн багшийг ижил болгоно уу.');

  const groupId = courseIds.length > 1 ? randomUUID() : null;
  const shared = {
    day_of_week: input.day_of_week,
    start_time: normalizeTime(input.start_time),
    end_time: normalizeTime(input.end_time),
    building: input.is_online ? null : input.building || null,
    room: input.is_online ? null : input.room ?? null,
    session_type: input.session_type,
    is_online: input.is_online,
    note: input.note ?? null,
    group_id: groupId,
  };

  // Бүх мөрийг урьдчилан шалгана — нэг нь давхцвал нэг ч мөр үүсэхгүй
  const semesterId = courses[0].semester_id;
  const existing = await semesterRows(semesterId, input.day_of_week);
  for (const c of courses) {
    const candidate = { ...shared, course_id: c.id, class_id: c.class_id, teacher_id: c.teacher_id };
    const [first] = findConflicts(candidate, existing);
    if (first) throw conflict(conflictMessage(first.kind, first.with));
  }

  const inserted = await run(supabase.from('schedules').insert(courses.map((c: any) => ({ ...shared, course_id: c.id }))).select(SELECT));
  const rows = inserted.map(mapSchedule);
  return { schedules: sortRows(rows), warnings: await capacityWarnings(rows) };
}

/** Өрөөний багтаамжийг шалгана — хориглохгүй, зөвхөн анхааруулна */
async function capacityWarnings(rows: ScheduleRow[]): Promise<string[]> {
  const first = rows[0];
  if (!first || first.is_online || !first.room) return [];
  const room = await run(
    supabase.from('rooms').select('capacity').eq('building', first.building ?? '').eq('code', first.room).maybeSingle(),
  );
  if (!room) return [`${first.building ?? ''} ${first.room} өрөө бүртгэлд алга. Өрөөний жагсаалтад нэмэхийг зөвлөж байна.`];
  const seats = rows.reduce((sum, r) => sum + (r.student_count ?? 0), 0);
  if (seats > room.capacity) {
    return [`Оюутны тоо (${seats}) өрөөний багтаамжаас (${room.capacity}) хэтэрсэн байна.`];
  }
  return [];
}

/**
 * Цагийг өөр гараг/цаг/өрөө рүү зөөх.
 * Нэгдсэн лекцийн нэг мөрийг зөөвөл бүлгийн бүх мөр хамт зөөгдөнө.
 */
export async function update(id: string, input: z.infer<typeof updateScheduleSchema>) {
  const current = required(await run(supabase.from('schedules').select('*').eq('id', id)), 'Хуваарь олдсонгүй.')[0];
  const group = current.group_id
    ? await run(supabase.from('schedules').select('*').eq('group_id', current.group_id))
    : [current];

  const patch = {
    day_of_week: input.day_of_week ?? current.day_of_week,
    start_time: normalizeTime(input.start_time ?? current.start_time),
    end_time: normalizeTime(input.end_time ?? current.end_time),
    session_type: input.session_type ?? current.session_type,
    is_online: input.is_online ?? current.is_online,
    note: input.note !== undefined ? input.note : current.note,
    building: input.building !== undefined ? input.building || null : current.building,
    room: input.room !== undefined ? input.room || null : current.room,
  };
  if (patch.is_online) {
    patch.room = null;
    patch.building = null;
  } else if (!patch.room) {
    throw unprocessable('Танхимын хичээлд өрөө сонгоно уу.');
  }

  const semesterId = (await run(supabase.from('courses').select('semester_id').eq('id', current.course_id).single())).semester_id;
  const existing = await semesterRows(semesterId, patch.day_of_week);
  const groupIds = new Set(group.map((g: any) => g.id));

  for (const row of group) {
    const course = await run(supabase.from('courses').select('class_id, teacher_id').eq('id', input.course_id ?? row.course_id).single());
    const candidate = {
      ...patch,
      id: row.id,
      course_id: input.course_id ?? row.course_id,
      class_id: course.class_id,
      teacher_id: course.teacher_id,
      group_id: row.group_id,
    };
    const [first] = findConflicts(candidate, existing.filter((e) => !groupIds.has(e.id)));
    if (first) throw conflict(conflictMessage(first.kind, first.with));
  }

  const ids = group.map((g: any) => g.id);
  await run(supabase.from('schedules').update(input.course_id ? { ...patch, course_id: input.course_id } : patch).in('id', ids).select('id'));
  const rows = (await run(supabase.from('schedules').select(SELECT).in('id', ids))).map(mapSchedule);
  void notifyScheduleChange(current, rows);
  return { schedules: sortRows(rows), warnings: await capacityWarnings(rows) };
}

const DAY_NAME: Record<number, string> = { 1: 'Даваа', 2: 'Мягмар', 3: 'Лхагва', 4: 'Пүрэв', 5: 'Баасан', 6: 'Бямба', 7: 'Ням' };
const place = (r: any) => (r.is_online ? 'Онлайн' : [r.building, r.room].filter(Boolean).join(' ') || '—');
const when = (r: any) => `${DAY_NAME[r.day_of_week] ?? ''} ${String(r.start_time).slice(0, 5)}`;

/** Хуваарь өөрчлөгдвөл тухайн хичээлийн оюутан, багшид мэдэгдэнэ (mobile push-тай) */
async function notifyScheduleChange(before: any, after: ScheduleRow[]) {
  try {
    const first: any = after[0];
    if (!first) return;
    const changes: string[] = [];
    if (place(before) !== place(first)) changes.push(`Өрөө: ${place(before)} → ${place(first)}`);
    if (when(before) !== when(first) || String(before.end_time).slice(0, 5) !== String(first.end_time).slice(0, 5)) {
      changes.push(`Цаг: ${when(before)} → ${when(first)}–${String(first.end_time).slice(0, 5)}`);
    }
    if (!changes.length) return;
    const title = 'Хуваарь шинэчлэгдлээ';
    const message = `${first.subject_name ?? 'Хичээл'}\n${changes.join('\n')}`;
    await notifyCourseStudents(after.map((r) => r.course_id), title, message, 'schedule');
    const teacherIds = [...new Set(after.map((r) => r.teacher_id).filter(Boolean))] as string[];
    if (teacherIds.length) {
      const emps = await run(supabase.from('employees').select('user_id').in('id', teacherIds));
      await notifyUsers(emps.map((e: any) => e.user_id), title, message, 'schedule');
    }
  } catch (err) {
    console.warn('[schedule-notify]', (err as Error).message);
  }
}

export async function remove(id: string, withGroup = false) {
  const current = required(await run(supabase.from('schedules').select('id, group_id').eq('id', id)), 'Хуваарь олдсонгүй.')[0];
  if (withGroup && current.group_id) {
    const rows = await run(supabase.from('schedules').delete().eq('group_id', current.group_id).select('id'));
    return { deleted: true, count: rows.length };
  }
  await run(supabase.from('schedules').delete().eq('id', id).select('id'));
  return { deleted: true, count: 1 };
}

/**
 * Сонгосон хичээл(үүд)-д тохирох СУЛ ЦАГУУДЫГ санал болгоно.
 * Анги, багш, өрөө бүгд сул байх цагуудыг эрэмбэлж буцаана.
 */
export async function suggestions(q: z.infer<typeof suggestionsQuery>) {
  const courseIds = q.course_ids.split(',').map((s) => s.trim()).filter(Boolean);
  const courses = await run(supabase.from('courses').select('id, semester_id, class_id, teacher_id').in('id', courseIds));
  if (!courses.length) throw notFound('Хичээл олдсонгүй.');

  const semesterId = courses[0].semester_id;
  const existing = await semesterRows(semesterId);
  const rooms = q.room ? [] : ((await run(supabase.from('rooms').select('building, code, capacity').eq('is_active', true))) as any[]);
  const seats = (await Promise.all(courses.map(async (c: any) => {
    const rows = await run(supabase.from('enrollments').select('id').eq('course_id', c.id).neq('status', 'dropped'));
    return rows.length;
  }))).reduce((a: number, b: number) => a + b, 0);

  const out: { day_of_week: number; start_time: string; end_time: string; rooms: { building: string; code: string; capacity: number }[] }[] = [];

  for (const day of WEEK_DAYS) {
    for (const slot of TIME_SLOTS) {
      const blocked = courses.some((c: any) =>
        findConflicts(
          { course_id: c.id, class_id: c.class_id, teacher_id: c.teacher_id, day_of_week: day, start_time: slot.start, end_time: slot.end, room: null, building: null, is_online: true },
          existing,
        ).length > 0,
      );
      if (blocked) continue;

      const busy = new Set(
        existing
          .filter((e) => !e.is_online && e.room && overlaps(e, { day_of_week: day, start_time: slot.start, end_time: slot.end }))
          .map((e) => `${e.building ?? ''}|${(e.room ?? '').trim().toLowerCase()}`),
      );
      const free = rooms
        .filter((r) => !busy.has(`${r.building}|${r.code.trim().toLowerCase()}`) && r.capacity >= seats)
        .sort((a, b) => a.capacity - b.capacity)
        .slice(0, 5)
        .map((r) => ({ building: r.building, code: r.code, capacity: r.capacity }));

      if (q.room && busy.has(`${q.building ?? ''}|${q.room.trim().toLowerCase()}`)) continue;
      out.push({ day_of_week: day, start_time: slot.start, end_time: slot.end, rooms: free });
    }
  }

  return { total_students: seats, slots: out.slice(0, q.limit ?? 20) };
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
