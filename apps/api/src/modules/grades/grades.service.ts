import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { avg, computeTotal, scoreToGrade, weightedGpa } from '../../utils/gpa';
import { COURSE_SELECT, mapCourse } from '../courses/courses.service';
import { ENROLLMENT_SELECT, mapEnrollment } from '../enrollments/enrollments.service';
import { notifyUsers } from '../notifications/notifications.service';
import type { saveGradesSchema } from './grades.schema';

export const items = (courseId: string) =>
  run(supabase.from('grade_items').select('*').eq('course_id', courseId).order('sort_order'));

/** Ноорог дүн хадгалах — нийт оноо, үсгэн үнэлгээг серверт бодно */
export async function save(courseId: string, input: z.infer<typeof saveGradesSchema>) {
  const gradeItems = await items(courseId);
  const maxById = new Map<string, number>(gradeItems.map((i: { id: string; max_score: number }) => [i.id, Number(i.max_score)]));

  for (const row of input.rows) {
    for (const [itemId, value] of Object.entries(row.scores)) {
      const max = maxById.get(itemId);
      if (max === undefined) throw unprocessable('Энэ хичээлд хамааралгүй үнэлгээний бүрэлдэхүүн илгээсэн байна.');
      if (value > max) throw unprocessable(`Оноо дээд хязгаараас (${max}) хэтэрсэн байна.`);
    }
  }

  const editable = await run(
    supabase.from('enrollments').select('id').eq('course_id', courseId).in('grade_status', ['draft', 'rejected']).in('id', input.rows.map((r) => r.enrollment_id)),
  );
  const allowed = new Set(editable.map((e) => e.id));

  await Promise.all(
    input.rows
      .filter((r) => allowed.has(r.enrollment_id))
      .map((r) => {
        const { total, complete } = computeTotal(r.scores, gradeItems);
        const grade = complete ? scoreToGrade(total) : null;
        return run(
          supabase
            .from('enrollments')
            .update({ scores: r.scores, total_score: complete ? total : null, letter_grade: grade?.letter ?? null, gpa_point: grade?.point ?? null, grade_status: 'draft' })
            .eq('id', r.enrollment_id)
            .select('id'),
        );
      }),
  );
  return { updated: allowed.size, skipped: input.rows.length - allowed.size };
}

export async function submit(courseId: string) {
  const rows = await run(supabase.from('enrollments').select('id, total_score').eq('course_id', courseId).in('grade_status', ['draft', 'rejected']));
  if (!rows.length) throw unprocessable('Илгээх дүн алга. Дүн аль хэдийн илгээгдсэн эсвэл баталгаажсан байна.');
  const incomplete = rows.filter((r) => r.total_score === null).length;
  if (incomplete) throw unprocessable(`${incomplete} оюутны дүн бүрэн биш байна. Бүх бүрэлдэхүүнийг бөглөөд дахин илгээнэ үү.`);

  await run(supabase.from('enrollments').update({ grade_status: 'submitted', submitted_at: new Date().toISOString() }).in('id', rows.map((r) => r.id)).select('id'));

  const academic = await run(supabase.from('users').select('id').eq('role', 'academic').eq('status', 'active'));
  const course = await run(supabase.from('courses').select(COURSE_SELECT).eq('id', courseId).single());
  const c = mapCourse(course);
  await notifyUsers(academic.map((a) => a.id), 'Хянах дүн ирлээ', `${c.teacher_name ?? 'Багш'} ${c.subject_name} (${c.class_name}) хичээлийн дүнг илгээлээ.`, 'grade');
  return { submitted: rows.length };
}

export async function pending() {
  const rows = (await run(supabase.from('enrollments').select(ENROLLMENT_SELECT).eq('grade_status', 'submitted'))).map(mapEnrollment);
  const courseIds = [...new Set(rows.map((r) => r.course_id as string))];
  if (!courseIds.length) return [];
  const courses = (await run(supabase.from('courses').select(COURSE_SELECT).in('id', courseIds))).map(mapCourse);
  return courses.map((course) => {
    const group = rows.filter((r) => r.course_id === course.id);
    return { course, count: group.length, avg_score: avg(group.map((r) => Number(r.total_score ?? 0))), submitted_at: group[0]?.submitted_at ?? null, rows: group };
  });
}

/** Баталгаажсан дүнгээр оюутны нийт голч, кредитийг дахин бодно */
export async function recomputeGpa(studentIds: string[]) {
  for (const studentId of studentIds) {
    const rows = await run(
      supabase.from('enrollments').select('gpa_point, courses(subjects(credit))').eq('student_id', studentId).eq('grade_status', 'approved'),
    );
    const list = rows.map((r: any) => ({ credit: Number(r.courses?.subjects?.credit ?? 0), gpa_point: r.gpa_point as number | null }));
    const passed = list.filter((r) => (r.gpa_point ?? 0) > 0).reduce((s, r) => s + r.credit, 0);
    await run(supabase.from('students').update({ gpa: weightedGpa(list), earned_credits: passed }).eq('id', studentId).select('id'));
  }
}

export async function approve(courseId: string, actor: AuthUser) {
  const rows = await run(
    supabase
      .from('enrollments')
      .update({ grade_status: 'approved', approved_at: new Date().toISOString() })
      .eq('course_id', courseId)
      .eq('grade_status', 'submitted')
      .select('student_id, students(user_id), courses(subjects(name))'),
  );
  if (!rows.length) throw unprocessable('Баталгаажуулах дүн алга.');
  await recomputeGpa(rows.map((r) => r.student_id));
  const subject = (rows[0] as any).courses?.subjects?.name ?? 'Хичээл';
  await notifyUsers(rows.map((r: any) => r.students?.user_id).filter(Boolean), 'Шинэ дүн баталгаажлаа', `${subject} хичээлийн таны дүн баталгаажлаа.`, 'grade', actor.id);
  return { approved: rows.length };
}

export async function reject(courseId: string, reason: string, actor: AuthUser) {
  const rows = await run(supabase.from('enrollments').update({ grade_status: 'rejected' }).eq('course_id', courseId).eq('grade_status', 'submitted').select('id'));
  if (!rows.length) throw unprocessable('Буцаах дүн алга.');
  const course = await run(supabase.from('courses').select('employees(user_id), subjects(name)').eq('id', courseId).single());
  const teacherUser = (course as any).employees?.user_id;
  if (teacherUser) await notifyUsers([teacherUser], `Дүн буцаагдлаа: ${(course as any).subjects?.name ?? ''}`, reason, 'grade', actor.id);
  return { rejected: rows.length };
}

/** Оюутан зөвхөн баталгаажсан дүнгээ харна */
export async function mine(actor: AuthUser) {
  const rows = await run(supabase.from('enrollments').select(ENROLLMENT_SELECT).eq('student_id', actor.studentId ?? ''));
  return rows.map(mapEnrollment).map((e) => (e.grade_status === 'approved' ? e : { ...e, scores: {}, total_score: null, letter_grade: null, gpa_point: null }));
}
