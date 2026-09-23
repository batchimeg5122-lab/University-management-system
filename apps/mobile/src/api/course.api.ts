import { get } from './client';
import type { Course, Enrollment } from '../types/models';

export const courseApi = {
  /** Оюутан: бүртгэлтэй хичээл, Багш: оноогдсон хичээл (API өөрөө шүүнэ) */
  list: (params: { semester_id?: string } = {}) => get<Course[]>('/courses', params),
  /** Зөвхөн багш (requireCourseAccess) */
  detail: (id: string) => get<Course>(`/courses/${id}`),
  /** Хичээлийн оюутнууд — багш */
  enrollments: (id: string) => get<Enrollment[]>(`/courses/${id}/enrollments`),
};
