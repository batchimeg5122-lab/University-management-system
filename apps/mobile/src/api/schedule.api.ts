import { del, get, post } from './client';
import type { ClassCancellationRow, Schedule, Semester } from '../types/models';

export interface CancelClassResult {
  cancelled?: boolean;
  restored?: boolean;
  cancel_date: string;
  reason?: string | null;
  schedule_ids: string[];
  schedules: Schedule[];
}

export const scheduleApi = {
  /** Оюутан, багшид зөвхөн өөрийнх нь хуваарь буцна */
  list: (params: { course_id?: string; semester_id?: string } = {}) => get<Schedule[]>('/schedules', params),
  currentSemester: () => get<Semester | null>('/semesters/current'),
  semesters: () => get<Semester[]>('/semesters'),

  /** Тухайн өдрийн хичээлийг цуцлах (багш) — оюутнуудад автоматаар мэдэгдэнэ */
  cancelClass: (scheduleId: string, body: { date?: string; reason?: string | null }) =>
    post<CancelClassResult>(`/schedules/${scheduleId}/cancel`, body),

  /** Цуцлалтыг буцаах */
  restoreClass: (scheduleId: string, date: string) =>
    del<CancelClassResult>(`/schedules/${scheduleId}/cancel?date=${encodeURIComponent(date)}`),

  /** Цуцлагдсан хичээлүүдийн жагсаалт */
  cancellations: (params: { from?: string; to?: string; course_id?: string } = {}) =>
    get<ClassCancellationRow[]>('/schedules/cancellations', params),
};
