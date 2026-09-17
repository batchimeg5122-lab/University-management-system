import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { classesApi } from './api';
import type { ClassGroup } from '@/types/models';

export const useClasses = (params: { program_id?: string } = {}) =>
  useQuery({ queryKey: ['classes', params], queryFn: () => classesApi.list(params) });

export function useSaveClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ClassGroup> & { id?: string }) => (id ? classesApi.update(id, body) : classesApi.create(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classes'] }),
  });
}
