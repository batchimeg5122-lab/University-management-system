import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import type { registerDeviceSchema, unregisterDeviceSchema } from './devices.schema';

/** Нэг token нэг хэрэглэгчид харьяалагдана (утас солигдвол шинэ эзэнд шилжинэ) */
export async function register(input: z.infer<typeof registerDeviceSchema>, actor: AuthUser) {
  const row = await run(
    supabase
      .from('push_tokens')
      .upsert(
        { token: input.token, user_id: actor.id, platform: input.platform, device_name: input.device_name ?? null, last_seen_at: new Date().toISOString() },
        { onConflict: 'token' },
      )
      .select('id, platform, device_name, last_seen_at')
      .single(),
  );
  return row;
}

export async function unregister(input: z.infer<typeof unregisterDeviceSchema>, actor: AuthUser) {
  await run(supabase.from('push_tokens').delete().eq('token', input.token).eq('user_id', actor.id).select('id'));
  return { deleted: true };
}

/** Push статистик — админ, удирдлага */
export async function stats() {
  const [{ data: tokens, error }, users] = await Promise.all([
    supabase.from('push_tokens').select('user_id, platform, created_at, last_seen_at, users(role)').limit(50000),
    run(supabase.from('users').select('role').eq('status', 'active').limit(100000)),
  ]);
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') throw new Error(error.message);
  const rows = (tokens ?? []) as any[];

  const byPlatform: Record<string, number> = {};
  rows.forEach((t) => (byPlatform[t.platform] = (byPlatform[t.platform] ?? 0) + 1));

  const usersWithDevice = new Map<string, string>();
  rows.forEach((t) => usersWithDevice.set(t.user_id, t.users?.role ?? 'unknown'));
  const totalByRole: Record<string, number> = {};
  (users as any[]).forEach((u) => (totalByRole[u.role] = (totalByRole[u.role] ?? 0) + 1));
  const withDeviceByRole: Record<string, number> = {};
  usersWithDevice.forEach((role) => (withDeviceByRole[role] = (withDeviceByRole[role] ?? 0) + 1));

  const day = 86_400_000;
  const now = Date.now();
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * day).toISOString().slice(0, 10);
    return { date: d, count: rows.filter((t) => String(t.created_at).slice(0, 10) === d).length };
  });

  return {
    total_devices: rows.length,
    users_with_device: usersWithDevice.size,
    active_30d: rows.filter((t) => now - new Date(t.last_seen_at).getTime() < 30 * day).length,
    by_platform: byPlatform,
    by_role: Object.keys({ ...totalByRole, ...withDeviceByRole }).map((role) => ({ role, users: totalByRole[role] ?? 0, with_device: withDeviceByRole[role] ?? 0 })),
    daily,
  };
}
