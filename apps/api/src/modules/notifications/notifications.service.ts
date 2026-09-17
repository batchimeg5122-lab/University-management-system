import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { forbidden } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run, toHttpError } from '../../utils/api-response';
import type { createAnnouncementSchema, listNotificationsQuery, updateNotificationSchema } from './notifications.schema';

const ANNOUNCERS = ['super_admin', 'academic', 'management'];

/** schema-д created_by багана байхгүй бол түүнийг хасаж дахин оролдоно */
async function insertNotifications(rows: Record<string, unknown>[], selectOne = false) {
  const attempt = (data: Record<string, unknown>[]) =>
    selectOne ? supabase.from('notifications').insert(data).select().single() : supabase.from('notifications').insert(data).select('id');
  let result = await attempt(rows);
  if (result.error && (result.error.code === 'PGRST204' || result.error.code === '42703')) {
    result = await attempt(rows.map(({ created_by: _c, ...r }) => r));
  }
  return result;
}

/** Хувь хүнд мэдэгдэл илгээнэ. Алдаа гарсан ч үндсэн үйлдлийг зогсоохгүй. */
export async function notifyUsers(userIds: string[], title: string, message: string, type: string, createdBy: string | null = null) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  const { error } = await insertNotifications(unique.map((user_id) => ({ user_id, title, message, type, is_published: true, created_by: createdBy })));
  if (error) console.warn('[notify]', error.message);
}

export async function list(q: z.infer<typeof listNotificationsQuery>, actor: AuthUser) {
  const now = new Date().toISOString();
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);

  if (q.scope === 'announcements' && ANNOUNCERS.includes(actor.role)) {
    query = query.is('user_id', null);
  } else {
    query = query
      .or(`user_id.eq.${actor.id},and(user_id.is.null,is_published.eq.true,or(target_role.is.null,target_role.eq.${actor.role}))`)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`expire_at.is.null,expire_at.gte.${now}`);
  }
  const rows: any[] = await run(query);

  // Нийтэлсэн хүний нэрийг тусад нь авна (created_by багана байгаа бол)
  const creatorIds = [...new Set(rows.map((n) => n.created_by).filter(Boolean))];
  const names = new Map<string, string>();
  if (creatorIds.length) {
    const users = await run(supabase.from('users').select('id, full_name').in('id', creatorIds));
    users.forEach((u) => names.set(u.id, u.full_name));
  }
  return rows.map((n) => ({ ...n, created_by_name: n.created_by ? names.get(n.created_by) ?? null : null }));
}

export async function create(input: z.infer<typeof createAnnouncementSchema>, actor: AuthUser) {
  const { data, error } = await insertNotifications([{ ...input, user_id: null, type: 'announcement', created_by: actor.id }], true);
  if (error) throw toHttpError(error);
  return data as any;
}

export async function update(id: string, input: z.infer<typeof updateNotificationSchema>, actor: AuthUser) {
  const row = required(await run(supabase.from('notifications').select('user_id').eq('id', id)), 'Мэдэгдэл олдсонгүй.')[0];
  const isAnnouncer = ANNOUNCERS.includes(actor.role);

  // Энгийн хэрэглэгч зөвхөн өөрийн мэдэгдлийг уншсан болгоно
  if (!isAnnouncer) {
    if (row.user_id !== actor.id) throw forbidden();
    return (await run(supabase.from('notifications').update({ is_read: input.is_read ?? true }).eq('id', id).select()))[0];
  }
  return (await run(supabase.from('notifications').update(input).eq('id', id).select()))[0];
}

export async function readAll(actor: AuthUser) {
  await run(supabase.from('notifications').update({ is_read: true }).eq('user_id', actor.id).eq('is_read', false).select('id'));
  return { ok: true };
}

export async function remove(id: string) {
  required(await run(supabase.from('notifications').delete().eq('id', id).is('user_id', null).select('id')), 'Зарлал олдсонгүй.');
  return { deleted: true };
}
