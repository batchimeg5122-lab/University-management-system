import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { invalidateAuthCache } from '../../middleware/auth.middleware';
import { forbidden, HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { getEmployeeView } from '../employees/employees.view';
import { getStudentView } from '../students/students.view';
import type { avatarUploadSchema, updateMeSchema } from './auth.schema';

/** Оюутны курс (year_level), харьяа сургуулийн нэр — mobile профайлд */
export async function studentExtras(studentId: string) {
  try {
    const row: any = await run(
      supabase.from('students').select('classes(year_level), programs(departments(parent_id))').eq('id', studentId).maybeSingle(),
    );
    const parentId = row?.programs?.departments?.parent_id ?? null;
    let schoolName: string | null = null;
    if (parentId) {
      const parent = await run(supabase.from('departments').select('name').eq('id', parentId).maybeSingle());
      schoolName = parent?.name ?? null;
    }
    return { year_level: row?.classes?.year_level ?? null, school_name: schoolName };
  } catch {
    return { year_level: null, school_name: null };
  }
}

export async function getSession(user: AuthUser) {
  const [row, student, employee, extras] = await Promise.all([
    run(supabase.from('users').select('*').eq('id', user.id).single()),
    user.studentId ? getStudentView(user.studentId) : null,
    user.employeeId ? getEmployeeView(user.employeeId) : null,
    user.studentId ? studentExtras(user.studentId) : null,
  ]);
  return { user: row, student: student ? { ...student, ...extras } : null, employee: employee ?? null };
}

/** Оюутны код / ажилтны кодоор нэвтрэх и-мэйлийг олно */
export async function lookupEmail(identifier: string) {
  const code = identifier.toUpperCase();
  const { data: student } = await supabase.from('students').select('users(email)').eq('student_code', code).maybeSingle();
  const { data: employee } = student ? { data: null } : await supabase.from('employees').select('users(email)').eq('employee_code', code).maybeSingle();
  const email = (student as any)?.users?.email ?? (employee as any)?.users?.email;
  // Бүртгэлтэй эсэхийг задруулахгүйн тулд ерөнхий мессеж
  if (!email) throw new HttpError(401, 'Код эсвэл нууц үг буруу байна.');
  return { email };
}

/** Профайл зургийн bucket: оюутан → student-images, бусад → teacher-images */
const avatarBucket = (user: AuthUser) => (user.role === 'student' ? 'student-images' : 'teacher-images');

const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export async function avatarUploadUrl(user: AuthUser, input: z.infer<typeof avatarUploadSchema>) {
  const bucket = avatarBucket(user);
  const path = `${user.id}/${randomUUID()}${EXT[input.mime_type] ?? ''}`;
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new HttpError(400, `Зураг байршуулах холбоос үүсгэж чадсангүй: ${error?.message}`);
  return { path, token: data.token, signed_url: data.signedUrl, bucket };
}

export async function updateMe(user: AuthUser, input: z.infer<typeof updateMeSchema>) {
  const patch: Record<string, unknown> = {};
  if (input.phone !== undefined) patch.phone = input.phone;

  if (input.avatar_path !== undefined) {
    if (input.avatar_path === null) {
      patch.avatar_url = null;
    } else {
      if (!input.avatar_path.startsWith(`${user.id}/`)) throw forbidden('Зургийн зам таны бүртгэлд хамаарахгүй байна.');
      const bucket = avatarBucket(user);
      const folder = user.id;
      const name = input.avatar_path.slice(folder.length + 1);
      const { data: files } = await supabase.storage.from(bucket).list(folder, { search: name, limit: 1 });
      if (!files?.length) throw new HttpError(422, 'Зураг байршаагүй байна. Дахин оролдоно уу.');
      patch.avatar_url = supabase.storage.from(bucket).getPublicUrl(input.avatar_path).data.publicUrl;
    }
  }

  await run(supabase.from('users').update(patch).eq('id', user.id).select('id'));
  invalidateAuthCache(user.id);
  return getSession(user);
}

// ---------------------------------------------------------------------
// Нэвтрэлтийн түүх
// ---------------------------------------------------------------------
export async function recordLogin(user: AuthUser, meta: { platform: string; ip: string | null; userAgent: string | null }) {
  const { error } = await supabase.from('login_history').insert({
    user_id: user.id,
    platform: meta.platform === 'mobile' ? 'mobile' : 'web',
    aal: user.aal ?? 'aal1',
    ip_address: meta.ip,
    user_agent: meta.userAgent?.slice(0, 300) ?? null,
  });
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') console.warn('[login-history]', error.message);
  return { ok: true };
}

export async function loginHistory(userId: string | null, limit = 50) {
  let q = supabase.from('login_history').select('*, users(full_name, email, role)').order('created_at', { ascending: false }).limit(Math.min(500, limit));
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    throw new HttpError(500, error.message);
  }
  return (data ?? []).map(({ users, ...r }: any) => ({ ...r, full_name: users?.full_name ?? null, email: users?.email ?? null, role: users?.role ?? null }));
}
