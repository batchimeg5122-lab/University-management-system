import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { required, run } from '../../utils/api-response';
import { overlaps } from '../../utils/timetable';
import { currentId } from '../semesters/semesters.service';
import type { createRoomSchema, listRoomsQuery, updateRoomSchema } from './rooms.schema';

export interface RoomRow {
  id: string;
  building: string;
  code: string;
  capacity: number;
  room_type: string;
  note: string | null;
  is_active: boolean;
  /** Тухайн цагт эзэлсэн эсэх (шүүлтүүр өгсөн үед) */
  busy?: boolean;
  busy_with?: string | null;
  /** Долоо хоногт хэдэн цаг ашиглагдаж байгаа */
  weekly_sessions?: number;
}

/**
 * Өрөөнүүд. day_of_week + цаг өгвөл тухайн цагт сул эсэхийг тооцож буцаана.
 */
export async function list(q: z.infer<typeof listRoomsQuery>): Promise<RoomRow[]> {
  let query = supabase.from('rooms').select('*').eq('is_active', true).order('building').order('code');
  if (q.building) query = query.eq('building', q.building);
  if (q.room_type) query = query.eq('room_type', q.room_type);
  const rooms = (await run(query)) as RoomRow[];

  const semester = q.semester_id || (await currentId());
  if (!semester) return rooms;

  const schedules = await run(
    supabase
      .from('schedules')
      .select('room, building, day_of_week, start_time, end_time, is_online, courses!inner(semester_id, subjects(name), classes(code))')
      .eq('courses.semester_id', semester),
  );

  const usage = new Map<string, number>();
  const busy = new Map<string, string>();
  const key = (building: string | null, room: string | null) => `${building ?? ''}|${(room ?? '').trim().toLowerCase()}`;

  schedules.forEach((s: any) => {
    if (s.is_online || !s.room) return;
    const k = key(s.building, s.room);
    usage.set(k, (usage.get(k) ?? 0) + 1);
    if (
      q.day_of_week &&
      q.start_time &&
      q.end_time &&
      overlaps({ day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }, { day_of_week: q.day_of_week, start_time: q.start_time, end_time: q.end_time })
    ) {
      busy.set(k, `${s.courses?.subjects?.name ?? 'Хичээл'}${s.courses?.classes?.code ? `, ${s.courses.classes.code}` : ''}`);
    }
  });

  return rooms.map((r) => {
    const k = key(r.building, r.code);
    return { ...r, weekly_sessions: usage.get(k) ?? 0, busy: busy.has(k), busy_with: busy.get(k) ?? null };
  });
}

export const create = (input: z.infer<typeof createRoomSchema>) => run(supabase.from('rooms').insert(input).select().single());

export async function update(id: string, input: z.infer<typeof updateRoomSchema>) {
  return required(await run(supabase.from('rooms').update(input).eq('id', id).select()), 'Өрөө олдсонгүй.')[0];
}
