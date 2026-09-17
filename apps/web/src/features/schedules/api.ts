import { del, get, patch, post } from '@/lib/api';
import type { Schedule, ScheduleConflict } from '@/types/models';

export type ScheduleFilters = {
  course_id?: string;
  class_id?: string;
  teacher_id?: string;
  room?: string;
  semester_id?: string;
  mine?: boolean;
};

export type ScheduleInput = Pick<Schedule, 'course_id' | 'day_of_week' | 'start_time' | 'end_time' | 'room' | 'building'>;

export const schedulesApi = {
  list: (params: ScheduleFilters) => get<Schedule[]>('/schedules', params),
  conflicts: (semester_id?: string) => get<ScheduleConflict[]>('/schedules/conflicts', { semester_id }),
  create: (body: ScheduleInput) => post<Schedule>('/schedules', body),
  update: (id: string, body: Partial<ScheduleInput>) => patch<Schedule>(`/schedules/${id}`, body),
  remove: (id: string) => del<{ deleted: boolean }>(`/schedules/${id}`),
};
