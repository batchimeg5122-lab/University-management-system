import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import type { saveAttendanceSchema } from './attendance.schema';

export async function byCourse(courseId: string, date?: string) {
  let query = supabase.from('attendance').select('*').eq('course_id', courseId);
  if (date) query = query.eq('attendance_date', date);
  return run(query);
}

export async function dates(courseId: string) {
  const rows = await run(supabase.from('attendance').select('attendance_date').eq('course_id', courseId).order('attendance_date', { ascending: false }).limit(5000));
  return [...new Set(rows.map((r) => r.attendance_date))];
}

export async function save(courseId: string, input: z.infer<typeof saveAttendanceSchema>) {
  const enrolled = await run(supabase.from('enrollments').select('student_id').eq('course_id', courseId).neq('status', 'dropped'));
  const allowed = new Set(enrolled.map((e) => e.student_id));
  const invalid = input.rows.filter((r) => !allowed.has(r.student_id)).length;
  if (invalid) throw unprocessable(`${invalid} оюутан энэ хичээлд бүртгэлгүй байна.`);

  const existing = await run(supabase.from('attendance').select('id, student_id').eq('course_id', courseId).eq('attendance_date', input.date));
  const idByStudent = new Map(existing.map((e) => [e.student_id, e.id]));

  const inserts = input.rows
    .filter((r) => !idByStudent.has(r.student_id))
    .map((r) => ({ course_id: courseId, student_id: r.student_id, attendance_date: input.date, status: r.status, note: r.note ?? null }));

  await Promise.all([
    inserts.length ? run(supabase.from('attendance').insert(inserts).select('id')) : null,
    ...input.rows
      .filter((r) => idByStudent.has(r.student_id))
      .map((r) => run(supabase.from('attendance').update({ status: r.status, note: r.note ?? null }).eq('id', idByStudent.get(r.student_id)!).select('id'))),
  ]);
  return { saved: input.rows.length, inserted: inserts.length };
}

export async function mine(actor: AuthUser) {
  const rows = await run(
    supabase.from('attendance').select('*, courses(subjects(name))').eq('student_id', actor.studentId ?? '').order('attendance_date', { ascending: false }),
  );
  return rows.map(({ courses, ...a }: any) => ({ ...a, subject_name: courses?.subjects?.name }));
}
