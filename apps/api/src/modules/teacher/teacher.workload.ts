import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { forbidden } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { addDays, localDate } from '../../utils/local-date';
import { COURSE_SELECT, mapCourse } from '../courses/courses.service';
import { currentId } from '../semesters/semesters.service';
import type { workloadQuery } from './teacher.schema';

const NO_MATCH = '00000000-0000-0000-0000-000000000000';
const SESSION_TYPES = ['lecture', 'seminar', 'lab', 'exam'] as const;
type SessionKind = (typeof SESSION_TYPES)[number];

const toMin = (t: string) => Number(String(t).slice(0, 2)) * 60 + Number(String(t).slice(3, 5));
/** Нэг "хичээлийн цаг" = 40 минут (академик цаг). 80 минутын хичээл = 2 цаг. */
const ACADEMIC_MINUTES = 40;

export interface WorkloadCourseRow {
  course_id: string;
  subject_code: string | null;
  subject_name: string | null;
  class_name: string | null;
  credit: number | null;
  student_count: number;
  /** Долоо хоногт: төрөл тус бүрийн академик цаг */
  weekly: Record<SessionKind, number>;
  weekly_total: number;
  weekly_minutes: number;
  /** Улирлын турш (долоо хоногийн тоогоор) */
  semester_total: number;
  session_count: number;
  cancelled_count: number;
}

/**
 * Багшийн хичээлийн цагийн тайлан (ачаалал).
 * - Багш: ЗӨВХӨН өөрийн (teacher_id query-г үл хэрэгсэнэ)
 * - Сургалтын алба, удирдлага, админ: багш заавал сонгоно, эсвэл бүх багшийн нийлбэр
 */
export async function workload(q: z.infer<typeof workloadQuery>, actor: AuthUser) {
  const isStaff = ['super_admin', 'academic', 'management'].includes(actor.role);
  if (!isStaff && actor.role !== 'teacher') throw forbidden('Хичээлийн цагийн тайланг харах эрх байхгүй.');

  const employeeId = actor.role === 'teacher' ? actor.employeeId ?? NO_MATCH : q.teacher_id || null;
  const semesterId = q.semester_id || (await currentId());

  // Улирлын мэдээлэл — долоо хоногийн тоог гаргахад
  const semester = semesterId
    ? await run(supabase.from('semesters').select('id, name, academic_year, start_date, end_date').eq('id', semesterId).maybeSingle())
    : null;
  const weeks = q.weeks ?? weeksOf(semester);

  let courseQuery = supabase.from('courses').select(COURSE_SELECT);
  if (semesterId) courseQuery = courseQuery.eq('semester_id', semesterId);
  if (employeeId) courseQuery = courseQuery.eq('teacher_id', employeeId);
  const courses = (await run(courseQuery)).map(mapCourse) as Record<string, any>[];
  const courseIds = courses.map((c) => c.id as string);

  const schedules: any[] = courseIds.length
    ? await run(supabase.from('schedules').select('id, course_id, day_of_week, start_time, end_time, session_type').in('course_id', courseIds))
    : [];

  // Ойрын 30 хоногийн цуцлалт (хүснэгт байхгүй бол хоосон)
  const cancelled = new Map<string, number>();
  if (schedules.length) {
    const today = localDate();
    const { data } = await supabase
      .from('class_cancellations')
      .select('schedule_id')
      .in('schedule_id', schedules.map((s) => s.id))
      .gte('cancel_date', addDays(today, -120))
      .lte('cancel_date', addDays(today, 30));
    for (const row of (data ?? []) as { schedule_id: string }[]) {
      const s = schedules.find((x) => x.id === row.schedule_id);
      if (s) cancelled.set(s.course_id, (cancelled.get(s.course_id) ?? 0) + 1);
    }
  }

  const rows: WorkloadCourseRow[] = courses.map((c) => {
    const own = schedules.filter((s) => s.course_id === c.id);
    const weekly = { lecture: 0, seminar: 0, lab: 0, exam: 0 } as Record<SessionKind, number>;
    let minutes = 0;
    for (const s of own) {
      const mins = Math.max(0, toMin(s.end_time) - toMin(s.start_time));
      minutes += mins;
      const kind = (SESSION_TYPES as readonly string[]).includes(s.session_type) ? (s.session_type as SessionKind) : 'lecture';
      weekly[kind] += Math.round(mins / ACADEMIC_MINUTES);
    }
    const weeklyTotal = SESSION_TYPES.reduce((sum, k) => sum + weekly[k], 0);
    return {
      course_id: c.id,
      subject_code: c.subject_code ?? null,
      subject_name: c.subject_name ?? null,
      class_name: c.class_name ?? null,
      credit: c.credit ?? null,
      student_count: c.student_count ?? 0,
      weekly,
      weekly_total: weeklyTotal,
      weekly_minutes: minutes,
      semester_total: weeklyTotal * weeks,
      session_count: own.length,
      cancelled_count: cancelled.get(c.id) ?? 0,
    };
  });

  rows.sort((a, b) => (a.subject_name ?? '').localeCompare(b.subject_name ?? '') || (a.class_name ?? '').localeCompare(b.class_name ?? ''));

  const teacher = employeeId
    ? await run(supabase.from('employees').select('id, position, users(full_name), departments(name)').eq('id', employeeId).maybeSingle())
    : null;

  const totals = {
    courses: rows.length,
    classes: new Set(courses.map((c) => c.class_id).filter(Boolean)).size,
    students: rows.reduce((s, r) => s + r.student_count, 0),
    credits: rows.reduce((s, r) => s + Number(r.credit ?? 0), 0),
    weekly_hours: rows.reduce((s, r) => s + r.weekly_total, 0),
    weekly_minutes: rows.reduce((s, r) => s + r.weekly_minutes, 0),
    semester_hours: rows.reduce((s, r) => s + r.semester_total, 0),
    sessions: rows.reduce((s, r) => s + r.session_count, 0),
    cancelled: rows.reduce((s, r) => s + r.cancelled_count, 0),
    by_type: SESSION_TYPES.reduce(
      (acc, k) => ({ ...acc, [k]: rows.reduce((s, r) => s + r.weekly[k], 0) }),
      {} as Record<SessionKind, number>,
    ),
  };

  return {
    teacher: teacher
      ? { id: teacher.id, name: (teacher as any).users?.full_name ?? null, position: teacher.position ?? null, department: (teacher as any).departments?.name ?? null }
      : null,
    semester: semester ? { id: semester.id, label: `${semester.academic_year} · ${semester.name}`, start_date: semester.start_date, end_date: semester.end_date } : null,
    weeks,
    academic_minutes: ACADEMIC_MINUTES,
    rows,
    totals,
  };
}

/** Улирлын хугацаанаас долоо хоногийн тоо (14–20 хооронд хязгаарлана) */
function weeksOf(semester: { start_date?: string | null; end_date?: string | null } | null): number {
  if (!semester?.start_date || !semester?.end_date) return 16;
  const days = (new Date(semester.end_date).getTime() - new Date(semester.start_date).getTime()) / 86_400_000;
  if (!Number.isFinite(days) || days <= 0) return 16;
  return Math.min(20, Math.max(14, Math.round(days / 7)));
}

/** Сургалтын алба: бүх багшийн ачааллын хураангуй (эрэмбэлсэн) */
export async function workloadByTeacher(q: z.infer<typeof workloadQuery>, actor: AuthUser) {
  if (!['super_admin', 'academic', 'management'].includes(actor.role)) throw forbidden('Зөвхөн Сургалтын алба, удирдлага харна.');
  const semesterId = q.semester_id || (await currentId());

  let courseQuery = supabase.from('courses').select(COURSE_SELECT);
  if (semesterId) courseQuery = courseQuery.eq('semester_id', semesterId);
  const courses = (await run(courseQuery)).map(mapCourse) as Record<string, any>[];
  const withTeacher = courses.filter((c) => c.teacher_id);
  const courseIds = withTeacher.map((c) => c.id as string);

  const schedules: any[] = courseIds.length
    ? await run(supabase.from('schedules').select('course_id, start_time, end_time').in('course_id', courseIds))
    : [];

  const byTeacher = new Map<string, { name: string | null; courses: number; classes: Set<string>; students: number; credits: number; weekly: number }>();
  for (const c of withTeacher) {
    const key = c.teacher_id as string;
    const entry = byTeacher.get(key) ?? { name: c.teacher_name ?? null, courses: 0, classes: new Set<string>(), students: 0, credits: 0, weekly: 0 };
    entry.courses += 1;
    if (c.class_id) entry.classes.add(c.class_id as string);
    entry.students += c.student_count ?? 0;
    entry.credits += Number(c.credit ?? 0);
    entry.weekly += schedules
      .filter((s) => s.course_id === c.id)
      .reduce((sum, s) => sum + Math.round(Math.max(0, toMin(s.end_time) - toMin(s.start_time)) / ACADEMIC_MINUTES), 0);
    byTeacher.set(key, entry);
  }

  return [...byTeacher.entries()]
    .map(([id, e]) => ({ teacher_id: id, teacher_name: e.name, courses: e.courses, classes: e.classes.size, students: e.students, credits: e.credits, weekly_hours: e.weekly }))
    .sort((a, b) => b.weekly_hours - a.weekly_hours || (a.teacher_name ?? '').localeCompare(b.teacher_name ?? ''));
}
