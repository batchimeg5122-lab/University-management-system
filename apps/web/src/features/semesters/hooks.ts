import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { semestersApi } from './api';
import type { Semester } from '@/types/models';

export const useSemesters = () => useQuery({ queryKey: ['semesters'], queryFn: semestersApi.list, staleTime: 5 * 60_000 });
export const useCurrentSemester = () => useQuery({ queryKey: ['semesters', 'current'], queryFn: semestersApi.current, staleTime: 5 * 60_000 });

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: Partial<Semester>) => semestersApi.create(b), onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }) });
}
export function useSetCurrentSemester() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => semestersApi.setCurrent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }) });
}
