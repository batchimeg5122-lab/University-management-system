import { get, patch, post } from '@/lib/api';
import type { ClassGroup } from '@/types/models';

export const classesApi = {
  list: (params?: { program_id?: string }) => get<ClassGroup[]>('/classes', params),
  create: (body: Partial<ClassGroup>) => post<ClassGroup>('/classes', body),
  update: (id: string, body: Partial<ClassGroup>) => patch<ClassGroup>(`/classes/${id}`, body),
};
