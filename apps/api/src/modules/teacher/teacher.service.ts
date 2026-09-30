import { supabase } from '../../config/supabase';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { localDate, localWeekday } from '../../utils/local-date';
import { COURSE_SELECT, mapCourse } from '../courses/courses.service';
import { list as listSchedules } from '../schedules/schedules.service';
import { currentId } from '../semesters/semesters.service';

const NO_MATCH = '00000000-0000-0000-0000-000000000000';

/**
 * Багшийн mobile dashboard — нэг хүсэлтээр:
 * өнөөдрийн хичээл, ирц бүртгэх шаардлагатай хичээл, дүнгийн төлөв, нийт оюутан
 */
export async function dashboard(actor: AuthUser) {
  const semesterId = await currentId();
  const today = localDate();
  const weekday = localWeekday();

  let courseQuery = supabase.from('courses').select(COURSE_SELECT).eq('teacher_id', actor.employeeId ?? NO_MATCH);
  if (semesterId) courseQuery = courseQuery.eq('semester_id', semesterId);
  const courses = (await run(courseQuery)).map(mapCourse);
  const courseIds: string[] = courses.map((c: { id: string }) => c.id);

  const [schedules, attendanceToday, enrollments] = await Promise.all([
    listSchedules({} as never, actor),
    courseIds.length
      ? run(supabase.from('attendance').select('course_id').in('course_id', courseIds).eq('attendance_date', today))
      : Promise.resolve([] as { course_id: string }[]),
    courseIds.length
      ? run(supabase.from('enrollments').select('course_id, grade_status').in('course_id', courseIds).neq('status', 'dropped'))
      : Promise.resolve([] as { course_id: string; grade_status: string }[]),
  ]);

  const taken = new Set((attendanceToday as { course_id: string }[]).map((a) => a.course_id));
  const todaySessions = schedules
    .filter((s) => s.day_of_week === weekday)
    .map((s) => ({ ...s, attendance_taken: taken.has(s.course_id) }));
  // Цуцлагдсан хичээлд ирц бүртгэх шаардлагагүй
  const attendancePending = new Set(todaySessions.filter((s) => !s.attendance_taken && !s.cancelled_today).map((s) => s.course_id)).size;

  const byCourse = new Map<string, Set<string>>();
  (enrollments as { course_id: string; grade_status: string }[]).forEach((e) => {
    if (!byCourse.has(e.course_id)) byCourse.set(e.course_id, new Set());
    byCourse.get(e.course_id)!.add(e.grade_status);
  });
  const countWith = (status: string) => [...byCourse.values()].filter((set) => set.has(status)).length;

  return {
    date: today,
    day_of_week: weekday,
    semester_id: semesterId,
    course_count: courses.length,
    student_count: courses.reduce((sum: number, c: { student_count?: number }) => sum + (c.student_count ?? 0), 0),
    today: todaySessions,
    attendance_pending: attendancePending,
    grades: {
      draft_courses: countWith('draft'),
      rejected_courses: countWith('rejected'),
      submitted_courses: countWith('submitted'),
      approved_courses: countWith('approved'),
    },
    courses,
  };
}
