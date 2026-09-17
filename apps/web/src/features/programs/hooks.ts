import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { programsApi } from './api';
import type { Program } from '@/types/models';

export const usePrograms = (params: { department_id?: string } = {}) =>
  useQuery({ queryKey: ['programs', params], queryFn: () => programsApi.list(params), staleTime: 5 * 60_000 });

export function useSaveProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Program> & { id?: string }) => (id ? programsApi.update(id, body) : programsApi.create(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });
}
