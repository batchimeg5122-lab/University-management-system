import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coursesApi, type CourseFilters } from './api';
import type { Course } from '@/types/models';

export const useCourses = (filters: CourseFilters) =>
  useQuery({ queryKey: ['courses', filters], queryFn: () => coursesApi.list(filters) });

export const useMyCourses = (semester_id?: string) => useCourses({ mine: true, semester_id });

export const useCourse = (id: string | undefined) =>
  useQuery({ queryKey: ['courses', 'detail', id], queryFn: () => coursesApi.detail(id!), enabled: !!id });

export function useSaveCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Course> & { id?: string }) => (id ? coursesApi.update(id, body) : coursesApi.create(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });
}
