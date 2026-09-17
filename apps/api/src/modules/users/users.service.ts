import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { invalidateAuthCache } from '../../middleware/auth.middleware';
import { conflict, forbidden, HttpError, notFound, unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { ilike } from '../../utils/pagination';
import { generateInitialPassword } from '../../utils/password';
import { findEmployeeViewByUser } from '../employees/employees.view';
import { findStudentViewByUser } from '../students/students.view';
import type { createUserSchema, listUsersQuery, resetPasswordSchema, updateUserSchema } from './users.schema';

export async function list(q: z.infer<typeof listUsersQuery>) {
  let query = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(1000);
  if (q.role) query = query.eq('role', q.role);
  if (q.status) query = query.eq('status', q.status);
  if (q.q) query = query.or(`full_name.ilike.${ilike(q.q)},email.ilike.${ilike(q.q)}`);
  return run(query);
}

/** Хэрэглэгч + оюутан/ажилтны профайл + нэвтрэлтийн мэдээлэл */
export async function detail(id: string) {
  const user = required(await run(supabase.from('users').select('*').eq('id', id)), 'Хэрэглэгч олдсонгүй.')[0];
  const [student, employee, auth] = await Promise.all([
    findStudentViewByUser(id),
    findEmployeeViewByUser(id),
    supabase.auth.admin.getUserById(id),
  ]);
  const a = auth.data?.user;
  return {
    user,
    student: student ?? null,
    employee: employee ?? null,
    auth: a
      ? {
          last_sign_in_at: a.last_sign_in_at ?? null,
          email_confirmed_at: a.email_confirmed_at ?? null,
          must_change_password: Boolean(a.user_metadata?.must_change_password),
          banned_until: (a as { banned_until?: string }).banned_until ?? null,
        }
      : null,
  };
}

function mapAuthError(error: { message: string; status?: number } | null, fallback: string): HttpError {
  const msg = error?.message.toLowerCase() ?? '';
  if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) return conflict('Энэ и-мэйл хаяг өөр хэрэглэгчид бүртгэлтэй байна.');
  if (msg.includes('rate limit') || error?.status === 429) return new HttpError(429, 'Supabase хүсэлтийн хязгаар хэтэрлээ. Хэдэн минут хүлээгээд дахин оролдоно уу.');
  if (msg.includes('password')) return unprocessable(`Нууц үг шаардлага хангахгүй байна: ${error?.message}`);
  if (msg.includes('not found') || error?.status === 404) return notFound('Нэвтрэх эрх (Supabase Auth) олдсонгүй.');
  return new HttpError(400, `${fallback}: ${error?.message}`);
}

/**
 * Supabase Auth хэрэглэгч + users мөр үүсгэнэ.
 * И-мэйл ИЛГЭЭХГҮЙ (анхдагч SMTP-ийн хязгаараас сэргийлнэ).
 * Нууц үг өгөөгүй бол анхны нууц үг үүсгэж буцаана.
 */
export async function createAuthUser(input: { email: string; password?: string; last_name: string; first_name: string; phone?: string | null; role: string }) {
  const initialPassword = input.password || generateInitialPassword();

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: initialPassword,
    email_confirm: true,
    user_metadata: { full_name: `${input.last_name} ${input.first_name}`, must_change_password: !input.password },
  });
  if (error || !data.user) throw mapAuthError(error, 'Нэвтрэх эрх үүсгэж чадсангүй');

  const row = {
    id: data.user.id,
    email: input.email,
    last_name: input.last_name,
    first_name: input.first_name,
    phone: input.phone ?? null,
    role: input.role,
    status: 'active',
  };
  const { data: user, error: upsertError } = await supabase.from('users').upsert(row).select().single();
  if (upsertError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new HttpError(400, `users хүснэгтэд бичиж чадсангүй: ${upsertError.message}`);
  }
  // Нууц үгийг зөвхөн нэг удаа, үүсгэсэн хариунд л буцаана (хадгалахгүй)
  return { ...user, initial_password: input.password ? null : initialPassword } as typeof user & { initial_password: string | null };
}

export const create = (input: z.infer<typeof createUserSchema>) => createAuthUser(input);

/** Сүүлийн идэвхтэй системийн админыг хасахаас сэргийлнэ */
async function assertNotLastAdmin(target: { id: string; role: string; status: string }, next: { role?: string; status?: string }) {
  if (target.role !== 'super_admin' || target.status !== 'active') return;
  const losingAdmin = (next.role && next.role !== 'super_admin') || (next.status && next.status !== 'active');
  if (!losingAdmin) return;
  const admins = await run(supabase.from('users').select('id').eq('role', 'super_admin').eq('status', 'active'));
  if (admins.length <= 1) throw forbidden('Системд дор хаяж нэг идэвхтэй системийн админ байх шаардлагатай.');
}

export async function update(id: string, input: z.infer<typeof updateUserSchema>, actor: AuthUser) {
  const current = required(await run(supabase.from('users').select('*').eq('id', id)), 'Хэрэглэгч олдсонгүй.')[0];

  if (id === actor.id && ((input.role && input.role !== current.role) || (input.status && input.status !== current.status))) {
    throw forbidden('Өөрийн эрх, төлөвийг өөрчлөх боломжгүй.');
  }
  await assertNotLastAdmin(current, input);

  const { student, employee, email, ...base } = input;
  const changed: string[] = [];

  // 1. Нэвтрэх и-мэйл (Supabase Auth + users)
  if (email && email !== current.email) {
    const { error } = await supabase.auth.admin.updateUserById(id, { email, email_confirm: true });
    if (error) throw mapAuthError(error, 'И-мэйл солиж чадсангүй');
    changed.push('email');
  }

  // 2. Үндсэн мэдээлэл
  const userPatch: Record<string, unknown> = { ...base };
  if (email && email !== current.email) userPatch.email = email;
  Object.keys(userPatch).forEach((k) => userPatch[k] === undefined && delete userPatch[k]);
  if (Object.keys(userPatch).length) {
    const { error } = await supabase.from('users').update(userPatch).eq('id', id);
    if (error) {
      // Auth-ийн и-мэйл солигдсон бол буцаана
      if (changed.includes('email') && current.email) await supabase.auth.admin.updateUserById(id, { email: current.email, email_confirm: true });
      throw new HttpError(400, `Хэрэглэгчийн мэдээлэл хадгалж чадсангүй: ${error.message}`);
    }
    changed.push(...Object.keys(base).filter((k) => (base as Record<string, unknown>)[k] !== undefined));
  }
  if (base.status && base.status !== 'active') {
    // Идэвхгүй болгосон хэрэглэгч шууд нэвтрэх боломжгүй болно
    await supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' });
  } else if (base.status === 'active' && current.status !== 'active') {
    await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' });
  }

  // 3. Оюутны профайл
  if (student && Object.keys(student).length) {
    const row = await run(supabase.from('students').select('id').eq('user_id', id).maybeSingle());
    if (!row) throw unprocessable('Энэ хэрэглэгч оюутны профайлгүй байна.');
    const patch: Record<string, unknown> = { ...student };
    if (student.student_code) {
      const dup = await run(supabase.from('students').select('id').eq('student_code', student.student_code).neq('id', row.id));
      if (dup.length) throw conflict('Оюутны код өөр оюутанд бүртгэлтэй байна.');
    }
    if (student.class_id) {
      const cls = await run(supabase.from('classes').select('program_id').eq('id', student.class_id).single());
      patch.program_id = cls.program_id;
    }
    await run(supabase.from('students').update(patch).eq('id', row.id).select('id'));
    changed.push(...Object.keys(student).map((k) => `student.${k}`));
  }

  // 4. Ажилтны профайл
  if (employee && Object.keys(employee).length) {
    const row = await run(supabase.from('employees').select('id').eq('user_id', id).maybeSingle());
    if (!row) throw unprocessable('Энэ хэрэглэгч ажилтны профайлгүй байна.');
    if (employee.employee_code) {
      const dup = await run(supabase.from('employees').select('id').eq('employee_code', employee.employee_code).neq('id', row.id));
      if (dup.length) throw conflict('Ажилтны код өөр ажилтанд бүртгэлтэй байна.');
    }
    await run(supabase.from('employees').update(employee).eq('id', row.id).select('id'));
    changed.push(...Object.keys(employee).map((k) => `employee.${k}`));
  }

  invalidateAuthCache(id);
  return { ...(await detail(id)), changed };
}

/**
 * Админ хэрэглэгчийн нууц үгийг шинээр тавина.
 * Одоогийн нууц үгийг харах боломжгүй (hash хэлбэрээр хадгалагддаг).
 */
export async function resetPassword(id: string, input: z.infer<typeof resetPasswordSchema>) {
  required(await run(supabase.from('users').select('id').eq('id', id)), 'Хэрэглэгч олдсонгүй.');

  const { data: existing, error: getError } = await supabase.auth.admin.getUserById(id);
  if (getError || !existing.user) throw mapAuthError(getError, 'Нэвтрэх эрх олдсонгүй');

  const password = input.password || generateInitialPassword();
  const { error } = await supabase.auth.admin.updateUserById(id, {
    password,
    // Нууц үг шинэчлэхэд баталгаажаагүй эрхийг мөн баталгаажуулна ("Email not confirmed" алдааг засна)
    email_confirm: true,
    user_metadata: { ...(existing.user.user_metadata ?? {}), must_change_password: input.must_change },
  });
  if (error) throw mapAuthError(error, 'Нууц үг солиж чадсангүй');

  invalidateAuthCache(id);
  return {
    // Автоматаар үүсгэсэн үед л нэг удаа буцаана
    password: input.password ? null : password,
    must_change_password: input.must_change,
  };
}

/**
 * Баталгаажаагүй (Email not confirmed) эрхийг баталгаажуулна.
 * Хуучин урилгын урсгалаар эсвэл Dashboard-оос "Auto confirm"-гүй үүссэн эрхэд хэрэгтэй.
 */
export async function confirmEmail(id: string) {
  required(await run(supabase.from('users').select('id').eq('id', id)), 'Хэрэглэгч олдсонгүй.');
  const { data, error } = await supabase.auth.admin.getUserById(id);
  if (error || !data.user) throw mapAuthError(error, 'Нэвтрэх эрх олдсонгүй');
  if (data.user.email_confirmed_at) return { already_confirmed: true, email_confirmed_at: data.user.email_confirmed_at };

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(id, { email_confirm: true });
  if (updateError) throw mapAuthError(updateError, 'Эрх баталгаажуулж чадсангүй');
  invalidateAuthCache(id);
  return { already_confirmed: false, email_confirmed_at: updated.user?.email_confirmed_at ?? new Date().toISOString() };
}

/** Бүх баталгаажаагүй эрхийг нэг дор баталгаажуулна (users хүснэгтэд бүртгэлтэйг л) */
export async function confirmAllEmails() {
  const known = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const rows = await run(supabase.from('users').select('id').range(from, from + 999));
    rows.forEach((r: { id: string }) => known.add(r.id));
    if (rows.length < 1000) break;
  }

  let confirmed = 0;
  const failed: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw mapAuthError(error, 'Хэрэглэгчдийн жагсаалт авч чадсангүй');
    for (const u of data.users) {
      if (u.email_confirmed_at || !known.has(u.id)) continue;
      const { error: e } = await supabase.auth.admin.updateUserById(u.id, { email_confirm: true });
      if (e) failed.push(u.email ?? u.id);
      else confirmed++;
    }
    if (data.users.length < 1000) break;
  }
  invalidateAuthCache();
  return { confirmed, failed };
}
