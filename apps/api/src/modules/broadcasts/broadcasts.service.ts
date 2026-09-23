import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { ROLES } from '../../utils/constants';
import { pushToUsers } from '../../utils/push';
import { currentId } from '../semesters/semesters.service';
import type { Audience, createBroadcastSchema } from './broadcasts.schema';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Админ', management: 'Удирдлага', academic: 'Сургалтын алба', finance: 'Санхүүгийн алба', teacher: 'Багш', student: 'Оюутан',
};

const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function inChunks<T>(ids: string[], fn: (part: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (const part of chunk(ids, 300)) out.push(...(await fn(part)));
  return out;
}

async function studentsUsers(filter: (q: any) => any): Promise<string[]> {
  const rows = await run(filter(supabase.from('students').select('user_id').eq('status', 'active')));
  return rows.map((r: any) => r.user_id).filter(Boolean);
}

async function teacherUsersOfCourses(courseQuery: (q: any) => any): Promise<string[]> {
  const semester = await currentId();
  let q = supabase.from('courses').select('employees(user_id)').not('teacher_id', 'is', null);
  if (semester) q = q.eq('semester_id', semester);
  const rows = await run(courseQuery(q));
  return rows.map((r: any) => r.employees?.user_id).filter(Boolean);
}

/** Хамрах хүрээ → хэрэглэгчийн ID-ууд (идэвхтэй хэрэглэгч л) */
export async function resolveAudience(a: Audience): Promise<string[]> {
  let ids: string[] = [];

  if (a.kind === 'all' || a.kind === 'role') {
    let q = supabase.from('users').select('id').eq('status', 'active').limit(50000);
    if (a.kind === 'role' && a.role) q = q.eq('role', a.role);
    return (await run(q)).map((u: any) => u.id);
  }

  if (a.kind === 'school') {
    const depts = await run(supabase.from('departments').select('id').or(`id.in.(${a.ids.join(',')}),parent_id.in.(${a.ids.join(',')})`));
    const deptIds = depts.map((d: any) => d.id);
    const programs = deptIds.length ? await run(supabase.from('programs').select('id').in('department_id', deptIds)) : [];
    const programIds = programs.map((p: any) => p.id);
    if (programIds.length) ids = await inChunks(programIds, (part) => studentsUsers((q) => q.in('program_id', part)));
    if (a.include_teachers && deptIds.length) {
      const emps = await run(supabase.from('employees').select('user_id').in('department_id', deptIds).eq('is_active', true));
      ids.push(...emps.map((e: any) => e.user_id));
    }
  }

  if (a.kind === 'program') {
    ids = await studentsUsers((q) => q.in('program_id', a.ids));
    if (a.include_teachers) {
      const classes = await run(supabase.from('classes').select('id').in('program_id', a.ids));
      const classIds = classes.map((c: any) => c.id);
      if (classIds.length) ids.push(...(await teacherUsersOfCourses((q) => q.in('class_id', classIds))));
    }
  }

  if (a.kind === 'class') {
    ids = await studentsUsers((q) => q.in('class_id', a.ids));
    if (a.include_teachers) ids.push(...(await teacherUsersOfCourses((q) => q.in('class_id', a.ids))));
  }

  if (a.kind === 'course') {
    const rows = await run(supabase.from('enrollments').select('students(user_id, status)').in('course_id', a.ids).neq('status', 'dropped'));
    ids = rows.filter((r: any) => r.students?.status === 'active').map((r: any) => r.students?.user_id).filter(Boolean);
    if (a.include_teachers) {
      const courses = await run(supabase.from('courses').select('employees(user_id)').in('id', a.ids));
      ids.push(...courses.map((c: any) => c.employees?.user_id).filter(Boolean));
    }
  }

  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  // Идэвхгүй хэрэглэгчийг хасна
  const active = await inChunks(unique, (part) => run(supabase.from('users').select('id').in('id', part).eq('status', 'active')));
  return active.map((u: any) => u.id);
}

async function audienceLabel(a: Audience): Promise<string> {
  if (a.kind === 'all') return 'Бүх хэрэглэгч';
  if (a.kind === 'role') return `Эрх: ${ROLE_LABEL[a.role ?? ''] ?? a.role}`;
  const table = { school: 'departments', program: 'programs', class: 'classes', course: 'courses' }[a.kind];
  const prefix = { school: 'Сургууль', program: 'Хөтөлбөр', class: 'Анги', course: 'Хичээл' }[a.kind];
  let names: string[] = [];
  if (a.kind === 'course') {
    const rows = await run(supabase.from('courses').select('subjects(name), classes(code)').in('id', a.ids));
    names = rows.map((r: any) => `${r.subjects?.name ?? ''} (${r.classes?.code ?? ''})`);
  } else {
    const rows = await run(supabase.from(table).select(a.kind === 'class' ? 'code' : 'name').in('id', a.ids));
    names = rows.map((r: any) => r.code ?? r.name);
  }
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');
  return `${prefix}: ${shown}${a.include_teachers ? ' (багш нартай)' : ''}`;
}

export async function preview(a: Audience) {
  const ids = await resolveAudience(a);
  return { count: ids.length, label: await audienceLabel(a) };
}

export async function create(input: z.infer<typeof createBroadcastSchema>, actor: AuthUser) {
  const recipients = await resolveAudience(input.audience);
  if (!recipients.length) throw new HttpError(422, 'Сонгосон хүрээнд хүлээн авагч алга.');
  if (recipients.length > 50000) throw new HttpError(422, 'Нэг удаад 50,000-аас олон хүнд илгээх боломжгүй.');

  const scheduled = !!input.publish_at && new Date(input.publish_at).getTime() > Date.now() + 30_000;
  const broadcast = await run(
    supabase
      .from('broadcasts')
      .insert({
        title: input.title,
        message: input.message,
        audience: input.audience,
        audience_label: await audienceLabel(input.audience),
        send_push: input.send_push,
        publish_at: scheduled ? input.publish_at : null,
        recipient_count: recipients.length,
        created_by: actor.id,
      })
      .select()
      .single(),
  );

  // Хүлээн авагч бүрт хувийн мэдэгдэл (уншсан эсэхийг хянах боломжтой)
  for (const part of chunk(recipients, 500)) {
    const { error } = await supabase.from('notifications').insert(
      part.map((user_id) => ({
        user_id,
        title: input.title,
        message: input.message,
        type: 'announcement',
        is_published: true,
        publish_at: scheduled ? input.publish_at : null,
        broadcast_id: broadcast.id,
        created_by: actor.id,
      })),
    );
    if (error) {
      await supabase.from('broadcasts').delete().eq('id', broadcast.id);
      throw new HttpError(500, `Мэдэгдэл хадгалж чадсангүй: ${error.message}`);
    }
  }

  if (input.send_push && !scheduled) {
    void pushToUsers(recipients, input.title, input.message.slice(0, 180), { type: 'announcement', broadcast_id: broadcast.id }).then(() =>
      supabase.from('broadcasts').update({ pushed_at: new Date().toISOString() }).eq('id', broadcast.id),
    );
  }
  return { ...broadcast, read_count: 0 };
}

export async function list() {
  const rows = await run(supabase.from('broadcasts').select('*, users(full_name)').order('created_at', { ascending: false }).limit(50));
  const counts = await Promise.all(
    rows.map((b: any) =>
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('broadcast_id', b.id).eq('is_read', true).then((r) => r.count ?? 0),
    ),
  );
  return rows.map(({ users, ...b }: any, i: number) => ({
    ...b,
    created_by_name: users?.full_name ?? null,
    read_count: counts[i],
    status: b.publish_at && new Date(b.publish_at).getTime() > Date.now() ? 'scheduled' : 'sent',
  }));
}

export async function remove(id: string) {
  await run(supabase.from('broadcasts').delete().eq('id', id).select('id'));
  return { deleted: true };
}

/** Товлосон мэдэгдлийн push — server.ts минут тутамд дуудна */
export async function processScheduled() {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('id, title, message')
    .eq('send_push', true)
    .is('pushed_at', null)
    .lte('publish_at', new Date().toISOString())
    .limit(20);
  if (error || !data?.length) return;
  for (const b of data) {
    await supabase.from('broadcasts').update({ pushed_at: new Date().toISOString() }).eq('id', b.id);
    const users = await run(supabase.from('notifications').select('user_id').eq('broadcast_id', b.id).limit(50000));
    await pushToUsers(users.map((u: any) => u.user_id), b.title, String(b.message).slice(0, 180), { type: 'announcement', broadcast_id: b.id });
  }
}

export const roleOptions = ROLES;
