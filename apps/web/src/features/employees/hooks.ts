import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi, type EmployeeFilters } from './api';
import type { EmployeeView } from '@/types/models';

export const useEmployees = (filters: EmployeeFilters = {}) =>
  useQuery({ queryKey: ['employees', filters], queryFn: () => employeesApi.list(filters) });

export const useTeachers = () => useEmployees({ type: 'teacher' });

export function useSaveEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<EmployeeView> & { id?: string; password?: string }): Promise<EmployeeView & { initial_password?: string | null }> =>
      id ? employeesApi.update(id, body) : employeesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}
