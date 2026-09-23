import { del, get, patch, post } from '@/lib/api';
import type { Schedule, ScheduleConflict } from '@/types/models';
import type { SessionType } from './lib/timetable';

export type ScheduleFilters = {
  course_id?: string;
  class_id?: string;
  teacher_id?: string;
  room?: string;
  semester_id?: string;
  mine?: boolean;
};

export interface ScheduleInput {
  /** Нэг хичээл, эсвэл нэгдсэн лекц бол олон хичээл */
  course_ids: string[];
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  building?: string | null;
  session_type: SessionType;
  is_online: boolean;
  note?: string | null;
}

export type ScheduleResult = { schedules: Schedule[]; warnings: string[] };

export interface SlotSuggestion {
  day_of_week: number;
  start_time: string;
  end_time: string;
  rooms: { building: string; code: string; capacity: number }[];
}

export const schedulesApi = {
  list: (params: ScheduleFilters) => get<Schedule[]>('/schedules', params),
  conflicts: (semester_id?: string) => get<ScheduleConflict[]>('/schedules/conflicts', { semester_id }),
  suggestions: (courseIds: string[], params: { building?: string; room?: string; limit?: number } = {}) =>
    get<{ total_students: number; slots: SlotSuggestion[] }>('/schedules/suggestions', { course_ids: courseIds.join(','), ...params }),
  create: (body: ScheduleInput) => post<ScheduleResult>('/schedules', body),
  update: (id: string, body: Partial<Omit<ScheduleInput, 'course_ids'>> & { course_id?: string }) => patch<ScheduleResult>(`/schedules/${id}`, body),
  remove: (id: string, withGroup = false) => del<{ deleted: boolean; count: number }>(`/schedules/${id}${withGroup ? '?group=true' : ''}`),
};
