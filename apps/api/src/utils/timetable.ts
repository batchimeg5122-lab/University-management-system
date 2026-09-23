/**
 * Хичээлийн хуваарийн цаг, давхцлын цэвэр (side-effect гүй) логик.
 * Service болон route-ууд давхцлыг энэ дүрмээр шалгана.
 * apps/web/src/features/schedules/lib/timetable.ts нь яг ижил дүрэмтэй.
 */

export interface TimeSlot {
  index: number;
  label: string;
  start: string; // HH:MM
  end: string;
}

/** Сургуулийн нэгдсэн цагийн хуваарь (80 минутын цаг, 20 минутын завсарлага) */
export const TIME_SLOTS: TimeSlot[] = [
  { index: 1, label: '1-р цаг', start: '08:00', end: '09:20' },
  { index: 2, label: '2-р цаг', start: '09:40', end: '11:00' },
  { index: 3, label: '3-р цаг', start: '11:20', end: '12:40' },
  { index: 4, label: '4-р цаг', start: '13:30', end: '14:50' },
  { index: 5, label: '5-р цаг', start: '15:10', end: '16:30' },
  { index: 6, label: '6-р цаг', start: '16:50', end: '18:10' },
];

export const WEEK_DAYS = [1, 2, 3, 4, 5, 6];

export const BUILDINGS = ['I байр', 'II байр', 'III байр'];

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const hhmm = (t: string) => t.slice(0, 5);

export function slotOf(start: string): TimeSlot | undefined {
  return TIME_SLOTS.find((s) => s.start === hhmm(start));
}

export type SessionType = 'lecture' | 'seminar' | 'lab' | 'exam';

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  lecture: 'Лекц',
  seminar: 'Семинар',
  lab: 'Лаборатори',
  exam: 'Шалгалт',
};

/** Нэгдсэн лекц зөвшөөрөх төрлүүд (нэг багш нэг өрөөнд олон ангид) */
export const MERGEABLE: SessionType[] = ['lecture', 'exam'];

/** Хуваарийн нэг мөрийг давхцал шалгахад шаардлагатай хэлбэр */
export interface SlotEntry {
  id?: string;
  course_id: string;
  class_id: string | null;
  teacher_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  building: string | null;
  /** Нэгдсэн лекцийн бүлэг — нэг бүлгийн мөрүүд хоорондоо давхцахгүй */
  group_id?: string | null;
  /** Онлайн хичээл өрөө эзэлдэггүй */
  is_online?: boolean;
  session_type?: SessionType;
}

export type ConflictKind = 'class' | 'teacher' | 'room';

export interface Conflict<T extends SlotEntry = SlotEntry> {
  kind: ConflictKind;
  with: T;
}

export const CONFLICT_LABEL: Record<ConflictKind, string> = {
  class: 'Анги давхцаж байна',
  teacher: 'Багш давхцаж байна',
  room: 'Өрөө давхцаж байна',
};

export function overlaps(a: Pick<SlotEntry, 'day_of_week' | 'start_time' | 'end_time'>, b: Pick<SlotEntry, 'day_of_week' | 'start_time' | 'end_time'>) {
  return a.day_of_week === b.day_of_week && toMin(a.start_time) < toMin(b.end_time) && toMin(b.start_time) < toMin(a.end_time);
}

const sameRoom = (a: SlotEntry, b: SlotEntry) =>
  !a.is_online &&
  !b.is_online &&
  !!a.room &&
  !!b.room &&
  a.room.trim().toLowerCase() === b.room.trim().toLowerCase() &&
  (a.building ?? '') === (b.building ?? '');

/** Нэг нэгдсэн лекцийн бүлэгт багш, өрөө давхцахгүй (санаатай хуваалцаж байгаа) */
const sameGroup = (a: SlotEntry, b: SlotEntry) => !!a.group_id && a.group_id === b.group_id;

/** candidate-ийг бусад хуваарьтай харьцуулж давхцлуудыг буцаана (өөрийгөө алгасна) */
export function findConflicts<T extends SlotEntry>(candidate: SlotEntry, others: T[]): Conflict<T>[] {
  const out: Conflict<T>[] = [];
  for (const o of others) {
    if (candidate.id && o.id === candidate.id) continue;
    if (!overlaps(candidate, o)) continue;
    // Анги хоёр газар нэгэн зэрэг байж болохгүй — нэгдсэн лекц ч гэсэн
    if (candidate.class_id && o.class_id === candidate.class_id) out.push({ kind: 'class', with: o });
    else if (sameGroup(candidate, o)) continue; // нэг нэгдсэн лекцийн мөрүүд
    else if (candidate.teacher_id && o.teacher_id === candidate.teacher_id) out.push({ kind: 'teacher', with: o });
    else if (sameRoom(candidate, o)) out.push({ kind: 'room', with: o });
  }
  return out;
}

/** Бүх хуваарь доторх давхцлын хосууд (өмнө нь орсон буруу өгөгдлийг илрүүлэх) */
export function findAllConflicts<T extends SlotEntry & { id: string }>(rows: T[]) {
  const pairs: { kind: ConflictKind; a: T; b: T }[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const [c] = findConflicts(rows[i], [rows[j]]);
      if (c) pairs.push({ kind: c.kind, a: rows[i], b: rows[j] });
    }
  }
  return pairs;
}

export function conflictMessage(kind: ConflictKind, other: { subject_name?: string; class_name?: string | null; room?: string | null; building?: string | null }) {
  const subject = other.subject_name ? ` (${other.subject_name}${other.class_name ? `, ${other.class_name}` : ''})` : '';
  if (kind === 'class') return `Энэ анги энэ цагт өөр хичээлтэй байна${subject}.`;
  if (kind === 'teacher') return `Багш энэ цагт өөр хичээл заах хуваарьтай байна${subject}.`;
  return `${other.building ? `${other.building} ` : ''}${other.room} өрөө энэ цагт завгүй байна${subject}.`;
}

/** Нэг цагт өрөөнд байгаа хүний тоо (нэгдсэн лекцийн ангиудыг нэмж тооцно) */
export function seatUsage(entries: { group_id?: string | null; student_count?: number }[], groupId?: string | null) {
  return entries.filter((e) => !groupId || e.group_id === groupId).reduce((sum, e) => sum + (e.student_count ?? 0), 0);
}
