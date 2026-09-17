import { get, patch, post } from '@/lib/api';
import type { Department } from '@/types/models';

export const departmentsApi = {
  list: (params?: { level?: string; parent_id?: string }) => get<Department[]>('/departments', params),
  create: (body: Partial<Department>) => post<Department>('/departments', body),
  update: (id: string, body: Partial<Department>) => patch<Department>(`/departments/${id}`, body),
};
