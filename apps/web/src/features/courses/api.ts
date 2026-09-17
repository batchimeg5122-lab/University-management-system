import { get, patch, post } from '@/lib/api';
import type { Course } from '@/types/models';

export type CourseFilters = { semester_id?: string; class_id?: string; teacher_id?: string; mine?: boolean };

export const coursesApi = {
  list: (params: CourseFilters) => get<Course[]>('/courses', params),
  detail: (id: string) => get<Course>(`/courses/${id}`),
  create: (body: Partial<Course>) => post<Course>('/courses', body),
  update: (id: string, body: Partial<Course>) => patch<Course>(`/courses/${id}`, body),
};
