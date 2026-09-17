import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subjectsApi } from './api';
import type { Subject } from '@/types/models';

export const useSubjects = (params: { q?: string; department_id?: string } = {}) =>
  useQuery({ queryKey: ['subjects', params], queryFn: () => subjectsApi.list(params), placeholderData: (p) => p });

export function useSaveSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Subject> & { id?: string }) => (id ? subjectsApi.update(id, body) : subjectsApi.create(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  });
}
