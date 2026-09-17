import { get, patch, post } from '@/lib/api';
import type { Subject } from '@/types/models';

export const subjectsApi = {
  list: (params?: { q?: string; department_id?: string }) => get<Subject[]>('/subjects', params),
  create: (body: Partial<Subject>) => post<Subject>('/subjects', body),
  update: (id: string, body: Partial<Subject>) => patch<Subject>(`/subjects/${id}`, body),
};
