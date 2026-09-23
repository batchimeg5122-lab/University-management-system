import { supabase } from '../config/supabase';

/**
 * Expo Push Notification илгээгч.
 * Mobile app-ын бүртгүүлсэн `push_tokens`-оор дамжуулна.
 * Алдаа гарсан ч үндсэн үйлдлийг зогсоохгүй (fire-and-forget).
 *
 * Тохиргоо (заавал биш): EXPO_ACCESS_TOKEN — Expo-н "Enhanced push security" асаасан бол.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

type PushData = Record<string, unknown>;

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function tokensFor(userIds: string[]): Promise<string[]> {
  const tokens: string[] = [];
  for (const ids of chunk(userIds, 300)) {
    const { data, error } = await supabase.from('push_tokens').select('token').in('user_id', ids);
    if (error) {
      // push_tokens migration ажиллаагүй бол чимээгүй алгасна
      if (error.code !== '42P01' && error.code !== 'PGRST205') console.warn('[push] token уншиж чадсангүй:', error.message);
      return [];
    }
    tokens.push(...(data ?? []).map((r: { token: string }) => r.token));
  }
  return [...new Set(tokens)];
}

async function send(tokens: string[], title: string, body: string, data: PushData) {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const invalid: string[] = [];
  for (const batch of chunk(tokens, CHUNK)) {
    const messages = batch.map((to) => ({ to, title, body, data, sound: 'default', channelId: 'default', priority: 'high' }));
    try {
      const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
      const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
      json?.data?.forEach((ticket, i) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') invalid.push(batch[i]);
      });
    } catch (err) {
      console.warn('[push] Expo руу илгээж чадсангүй:', (err as Error).message);
    }
  }
  // Устгагдсан апп-ын token-уудыг цэвэрлэнэ
  if (invalid.length) await supabase.from('push_tokens').delete().in('token', invalid);
}

/** Тодорхой хэрэглэгчдэд push илгээнэ */
export async function pushToUsers(userIds: string[], title: string, body: string, data: PushData = {}) {
  try {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return;
    const tokens = await tokensFor(unique);
    if (tokens.length) await send(tokens, title, body, data);
  } catch (err) {
    console.warn('[push]', (err as Error).message);
  }
}

/** Role-оор (null бол бүх идэвхтэй хэрэглэгч) push илгээнэ — зарлалд */
export async function pushToRole(role: string | null, title: string, body: string, data: PushData = {}) {
  try {
    let query = supabase.from('users').select('id').eq('status', 'active').limit(20000);
    if (role) query = query.eq('role', role);
    const { data: users, error } = await query;
    if (error) return console.warn('[push] хэрэглэгч уншиж чадсангүй:', error.message);
    await pushToUsers((users ?? []).map((u: { id: string }) => u.id), title, body, data);
  } catch (err) {
    console.warn('[push]', (err as Error).message);
  }
}

/**
 * Хэрэглэгч бүрт ӨӨР агуулгатай push (нэхэмжлэл, өр төлбөрийн сануулга).
 * Token-уудыг нэг удаа уншиж, 100-аар багцлан илгээнэ.
 */
export async function pushPersonal(items: { userId: string; title: string; body: string; data?: PushData }[]) {
  try {
    if (!items.length) return;
    const userIds = [...new Set(items.map((i) => i.userId))];
    const byUser = new Map<string, string[]>();
    for (const ids of chunk(userIds, 300)) {
      const { data, error } = await supabase.from('push_tokens').select('user_id, token').in('user_id', ids);
      if (error) return;
      (data ?? []).forEach((r: { user_id: string; token: string }) => byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.token]));
    }
    const messages = items.flatMap((i) => (byUser.get(i.userId) ?? []).map((to) => ({ to, title: i.title, body: i.body, data: i.data ?? {}, sound: 'default', channelId: 'default', priority: 'high' })));
    const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    for (const batch of chunk(messages, CHUNK)) {
      await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(batch) }).catch(() => undefined);
    }
  } catch (err) {
    console.warn('[push]', (err as Error).message);
  }
}
