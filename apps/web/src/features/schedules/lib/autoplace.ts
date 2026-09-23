import type { Course, Schedule } from '@/types/models';
import { findConflicts, TIME_SLOTS, type SlotEntry } from './timetable';

export interface RoomOption {
  building: string;
  code: string;
  capacity: number;
  is_active: boolean;
  room_type?: string;
}

export interface Placement {
  course: Course;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  building: string | null;
}

/**
 * Хуваарьгүй хичээлүүдийг давхцалгүй цагт АВТОМАТААР байршуулах (шунахай алгоритм).
 * 1) Олон оюутантай хичээлийг эхэлж байршуулна (том өрөө хомс)
 * 2) Анги, багш давхцахгүй, ангид өдөрт ≤3 цаг байхаар Даваа–Баасан, дараа нь Бямба
 * 3) Багтаамж хүрэлцэх хамгийн жижиг сул өрөөг сонгоно
 * Үр дүн нь САНАЛ — хэрэглэгч шалгаж хадгална.
 */
export function autoPlace(courses: Course[], existing: Schedule[], rooms: RoomOption[], opts: { days?: number[]; maxPerDay?: number } = {}) {
  const days = opts.days ?? [1, 2, 3, 4, 5, 6];
  const maxPerDay = opts.maxPerDay ?? 3;
  const scheduled = new Set(existing.map((s) => s.course_id));
  const pending = courses.filter((c) => !scheduled.has(c.id)).sort((a, b) => (b.student_count ?? 0) - (a.student_count ?? 0));
  const activeRooms = rooms.filter((r) => r.is_active).sort((a, b) => a.capacity - b.capacity);

  const taken: SlotEntry[] = existing.map((s) => ({ ...s }));
  const placed: Placement[] = [];
  const unplaced: { course: Course; reason: string }[] = [];

  const perDay = (classId: string | null, day: number) => (classId ? taken.filter((t) => t.class_id === classId && t.day_of_week === day).length : 0);

  for (const course of pending) {
    let done = false;
    // Өдрүүдийг ангийн ачааллаар эрэмбэлж жигд тараана
    const orderedDays = [...days].sort((a, b) => perDay(course.class_id, a) - perDay(course.class_id, b) || a - b);
    for (const day of orderedDays) {
      if (perDay(course.class_id, day) >= maxPerDay) continue;
      for (const slot of TIME_SLOTS) {
        const candidate: SlotEntry = { course_id: course.id, class_id: course.class_id, teacher_id: course.teacher_id, day_of_week: day, start_time: slot.start, end_time: slot.end, room: null, building: null };
        if (findConflicts(candidate, taken).length) continue;
        const need = course.student_count ?? 0;
        const room = activeRooms.find((r) => r.capacity >= need && !findConflicts({ ...candidate, room: r.code, building: r.building }, taken).some((c) => c.kind === 'room'));
        if (!room) continue;
        const entry = { ...candidate, room: room.code, building: room.building };
        taken.push(entry);
        placed.push({ course, day_of_week: day, start_time: slot.start, end_time: slot.end, room: room.code, building: room.building });
        done = true;
        break;
      }
      if (done) break;
    }
    if (!done) unplaced.push({ course, reason: !activeRooms.some((r) => r.capacity >= (course.student_count ?? 0)) ? 'Багтаамж хүрэх өрөө алга' : 'Анги/багшид сул цаг алга' });
  }
  return { placed, unplaced };
}
