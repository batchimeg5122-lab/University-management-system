import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from './api';
import type { Department } from '@/types/models';

export const useDepartments = (params: { level?: string; parent_id?: string } = {}) =>
  useQuery({ queryKey: ['departments', params], queryFn: () => departmentsApi.list(params), staleTime: 5 * 60_000 });

export function useSaveDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Department> & { id?: string }) => (id ? departmentsApi.update(id, body) : departmentsApi.create(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}
