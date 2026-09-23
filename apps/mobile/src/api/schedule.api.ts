import { get } from './client';
import type { Schedule, Semester } from '../types/models';

export const scheduleApi = {
  /** Оюутан, багшид зөвхөн өөрийнх нь хуваарь буцна */
  list: (params: { course_id?: string; semester_id?: string } = {}) => get<Schedule[]>('/schedules', params),
  currentSemester: () => get<Semester | null>('/semesters/current'),
  semesters: () => get<Semester[]>('/semesters'),
};
