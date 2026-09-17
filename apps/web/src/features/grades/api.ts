import { get, post, put } from '@/lib/api';
import type { Course, Enrollment, GradeItem } from '@/types/models';

export type PendingGradeGroup = { course: Course; count: number; avg_score: number; submitted_at: string | null; rows: Enrollment[] };

export const gradesApi = {
  items: (courseId: string) => get<GradeItem[]>(`/courses/${courseId}/grade-items`),
  enrollments: (courseId: string) => get<Enrollment[]>(`/courses/${courseId}/enrollments`),
  save: (courseId: string, rows: { enrollment_id: string; scores: Record<string, number> }[]) => put<{ updated: number }>(`/courses/${courseId}/grades`, { rows }),
  submit: (courseId: string) => post<{ submitted: number }>(`/courses/${courseId}/grades/submit`),
  pending: () => get<PendingGradeGroup[]>('/grades/pending'),
  approve: (course_id: string) => post<{ approved: number }>('/grades/approve', { course_id }),
  reject: (course_id: string, reason: string) => post<{ rejected: number }>('/grades/reject', { course_id, reason }),
  mine: () => get<Enrollment[]>('/grades/me'),
};
