import { get, put } from '@/lib/api';
import type { Attendance, AttendanceStatus } from '@/types/models';

export type AttendanceRowInput = { student_id: string; status: AttendanceStatus; note?: string };

export const attendanceApi = {
  byCourse: (courseId: string, date?: string) => get<Attendance[]>(`/courses/${courseId}/attendance`, { date }),
  dates: (courseId: string) => get<string[]>(`/courses/${courseId}/attendance-dates`),
  save: (courseId: string, date: string, rows: AttendanceRowInput[]) => put<{ saved: number }>(`/courses/${courseId}/attendance`, { date, rows }),
  mine: () => get<Attendance[]>('/attendance/me'),
};
