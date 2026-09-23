import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import type { AuthUser } from '../types/express';
import { HttpError } from './error.middleware';

const cache = new Map<string, { user: AuthUser; expires: number }>();
const TTL = 30_000;

export function invalidateAuthCache(userId?: string) {
  if (!userId) return cache.clear();
  for (const [token, entry] of cache) if (entry.user.id === userId) cache.delete(token);
}

/**
 * JWT payload-оос aal (2FA түвшин), session_id-г уншина.
 * Гарын үсгийг getUser() аль хэдийн шалгасан тул зөвхөн задалж уншина.
 */
export function tokenClaims(token: string): { aal: 'aal1' | 'aal2'; sessionId: string | null } {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return { aal: payload?.aal === 'aal2' ? 'aal2' : 'aal1', sessionId: payload?.session_id ?? null };
  } catch {
    return { aal: 'aal1', sessionId: null };
  }
}

/** Authorization: Bearer <supabase access token> → req.user */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Нэвтрэх шаардлагатай.');

    const hit = cache.get(token);
    if (hit && hit.expires > Date.now()) {
      req.user = hit.user;
      return next();
    }

    const { data: auth, error } = await supabase.auth.getUser(token);
    if (error || !auth.user) throw new HttpError(401, 'Нэвтрэлтийн хугацаа дууссан байна. Дахин нэвтэрнэ үү.');

    const [{ data: row }, { data: student }, { data: employee }] = await Promise.all([
      supabase.from('users').select('id, role, full_name, email, status').eq('id', auth.user.id).maybeSingle(),
      supabase.from('students').select('id').eq('user_id', auth.user.id).maybeSingle(),
      supabase.from('employees').select('id').eq('user_id', auth.user.id).maybeSingle(),
    ]);

    if (!row) throw new HttpError(403, 'Та Supabase Auth-д бүртгэлтэй ч `users` хүснэгтэд бүртгэлгүй байна. Системийн админд хандана уу.');
    if (row.status !== 'active') throw new HttpError(403, 'Таны эрх идэвхгүй эсвэл түдгэлзсэн байна.');

    const user: AuthUser = {
      id: row.id,
      role: row.role,
      fullName: row.full_name,
      email: row.email,
      studentId: student?.id ?? null,
      employeeId: employee?.id ?? null,
      ...tokenClaims(token),
    };
    cache.set(token, { user, expires: Date.now() + TTL });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
