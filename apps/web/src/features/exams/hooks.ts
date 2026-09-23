import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examsApi, type ExamInput } from './api';

export const useExams = (params: { semester_id?: string; course_id?: string; upcoming?: boolean } = {}) =>
  useQuery({ queryKey: ['exams', params], queryFn: () => examsApi.list(params), placeholderData: (p) => p });

export function useSaveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ExamInput> & { id?: string }) => (id ? examsApi.update(id, body) : examsApi.create(body as ExamInput)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: examsApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }) });
}
