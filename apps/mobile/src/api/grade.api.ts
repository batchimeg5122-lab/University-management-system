import { get, post, put } from './client';
import type { CourseStats, Enrollment, GradeItem, StudentSummary } from '../types/models';

export const gradeApi = {
  /** Оюутан: баталгаажаагүй дүнгийн эцсийн оноо null ирнэ (зөвхөн явц) */
  mine: () => get<Enrollment[]>('/grades/me'),
  summary: () => get<StudentSummary>('/reports/student-summary'),
  items: (courseId: string) => get<GradeItem[]>(`/courses/${courseId}/grade-items`),
  save: (courseId: string, rows: { enrollment_id: string; scores: Record<string, number> }[]) =>
    put<{ updated: number }>(`/courses/${courseId}/grades`, { rows }),
  submit: (courseId: string) => post<{ submitted: number }>(`/courses/${courseId}/grades/submit`),
  courseStats: (courseId: string) => get<CourseStats>(`/reports/courses/${courseId}`),
};
