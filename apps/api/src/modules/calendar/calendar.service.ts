import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { pushToRole } from '../../utils/push';
import type { eventSchema, listEventsQuery, updateEventSchema } from './calendar.schema';

export const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday: 'Амралтын өдөр',
  exam_week: 'Шалгалтын долоо хоног',
  registration: 'Бүртгэл',
  break: 'Амралт',
  deadline: 'Эцсийн хугацаа',
  event: 'Арга хэмжээ',
};

const missing = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === 'PGRST205';

/** Хүрээнд давхцах үйл явдлууд. Хэрэглэгчийн эрхэд хамаатайг л харуулна */
export async function list(q: z.infer<typeof listEventsQuery>, actor: AuthUser) {
  let query = supabase.from('academic_events').select('*').order('start_date').limit(1000);
  if (q.from) query = query.gte('end_date', q.from);
  if (q.to) query = query.lte('start_date', q.to);
  if (!['super_admin', 'academic', 'management'].includes(actor.role)) query = query.or(`target_role.is.null,target_role.eq.${actor.role}`);
  const { data, error } = await query;
  if (error) {
    if (missing(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function create(input: z.infer<typeof eventSchema>, actor: AuthUser) {
  const { notify, ...row } = input;
  const created = await run(supabase.from('academic_events').insert({ ...row, created_by: actor.id }).select().single());
  if (notify) {
    const when = row.start_date === row.end_date ? row.start_date : `${row.start_date} – ${row.end_date}`;
    void pushToRole(row.target_role ?? null, `Академик календарь: ${row.title}`, `${EVENT_TYPE_LABEL[row.event_type] ?? ''} · ${when}`, { type: 'announcement', kind: 'calendar' });
  }
  return created;
}

export async function update(id: string, input: z.infer<typeof updateEventSchema>) {
  const current = required(await run(supabase.from('academic_events').select('*').eq('id', id)), 'Үйл явдал олдсонгүй.')[0];
  const { notify: _n, ...patch } = input;
  const next = { ...current, ...patch };
  if (next.end_date < next.start_date) throw new HttpError(422, 'Дуусах огноо эхлэхээс өмнө байж болохгүй');
  return run(supabase.from('academic_events').update(patch).eq('id', id).select().single());
}

export async function remove(id: string) {
  await run(supabase.from('academic_events').delete().eq('id', id).select('id'));
  return { deleted: true };
}

/** Тухайн өдөр амралтын өдөр эсэх (ирц, тайланд ашиглана) */
export async function isHoliday(date: string) {
  const { data, error } = await supabase.from('academic_events').select('id').in('event_type', ['holiday', 'break']).lte('start_date', date).gte('end_date', date).limit(1);
  return !error && (data?.length ?? 0) > 0;
}
