import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { get as getSetting } from '../settings/settings.service';

export type Platform = 'web' | 'mobile';

export interface SessionRow {
  platform: Platform;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

const CACHE_TTL = 15_000;
const cache = new Map<string, { sessionId: string | null; expires: number }>();
const key = (userId: string, platform: Platform) => `${userId}:${platform}`;
const missing = (e: { code?: string } | null | undefined) => e?.code === '42P01' || e?.code === 'PGRST205';

export const platformOf = (header: unknown): Platform => (String(header ?? '').toLowerCase() === 'mobile' ? 'mobile' : 'web');

/** Тохиргоо: энэ хэрэглэгчид "нэг платформ = нэг нэвтрэлт" үйлчлэх үү */
export async function enforcedFor(role: string) {
  const s = await getSetting('security');
  if (!s.single_session) return false;
  return s.single_session_roles.length === 0 || s.single_session_roles.includes(role as never);
}

/** Нэвтрэхэд (login-event) session-ийг тухайн платформд ЭЗЭМШҮҮЛНЭ — өмнөх нь хүчингүй болно */
export async function claim(user: AuthUser, platform: Platform, meta: { ip: string | null; userAgent: string | null }) {
  if (!user.sessionId) return { claimed: false };
  const { error } = await supabase.from('active_sessions').upsert(
    {
      user_id: user.id,
      platform,
      session_id: user.sessionId,
      ip_address: meta.ip,
      user_agent: meta.userAgent?.slice(0, 300) ?? null,
      created_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' },
  );
  if (error && !missing(error)) console.warn('[sessions]', error.message);
  cache.set(key(user.id, platform), { sessionId: user.sessionId, expires: Date.now() + CACHE_TTL });
  return { claimed: !error };
}

/**
 * Одоогийн session тухайн платформын идэвхтэй session мөн эсэх.
 * Бүртгэлгүй бол (хуучин session, эсвэл login-event хүрээгүй) өөрөө эзэмшинэ.
 */
export async function isCurrent(user: AuthUser, platform: Platform): Promise<boolean> {
  if (!user.sessionId) return true;
  const k = key(user.id, platform);
  const hit = cache.get(k);
  if (hit && hit.expires > Date.now()) return hit.sessionId === null || hit.sessionId === user.sessionId;

  const { data, error } = await supabase.from('active_sessions').select('session_id').eq('user_id', user.id).eq('platform', platform).maybeSingle();
  if (error) {
    if (missing(error)) return true; // migration ажиллаагүй — хязгаарлахгүй
    console.warn('[sessions]', error.message);
    return true;
  }
  if (!data) {
    await claim(user, platform, { ip: null, userAgent: null });
    return true;
  }
  cache.set(k, { sessionId: data.session_id, expires: Date.now() + CACHE_TTL });
  return data.session_id === user.sessionId;
}

export async function list(userId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase.from('active_sessions').select('*').eq('user_id', userId);
  if (error) return [];
  return (data ?? []) as SessionRow[];
}

/** Тухайн платформын нэвтрэлтийг гаргах (өөрийнхөө ч гэсэн) */
export async function revoke(userId: string, platform: Platform) {
  const { error } = await supabase.from('active_sessions').delete().eq('user_id', userId).eq('platform', platform);
  if (error && !missing(error)) throw new HttpError(500, error.message);
  cache.delete(key(userId, platform));
  return { revoked: true };
}

export const clearSessionCache = () => cache.clear();
