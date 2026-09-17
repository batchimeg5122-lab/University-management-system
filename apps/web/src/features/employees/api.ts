import { get, patch, post } from '@/lib/api';
import type { EmployeeView } from '@/types/models';

export type EmployeeFilters = { type?: string; department_id?: string; q?: string };

export const employeesApi = {
  list: (params: EmployeeFilters) => get<EmployeeView[]>('/employees', params),
  create: (body: Partial<EmployeeView> & { password?: string }) => post<EmployeeView & { initial_password?: string | null }>('/employees', body),
  update: (id: string, body: Partial<EmployeeView>) => patch<EmployeeView>(`/employees/${id}`, body),
};
