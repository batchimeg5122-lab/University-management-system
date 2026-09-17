import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsApi, type CreatedStudent, type StudentFilters, type StudentInput } from './api';

export const useStudents = (filters: StudentFilters) =>
  useQuery({ queryKey: ['students', filters], queryFn: () => studentsApi.list(filters), placeholderData: (prev) => prev });

export const useStudent = (id: string | undefined) =>
  useQuery({ queryKey: ['students', 'detail', id], queryFn: () => studentsApi.detail(id!), enabled: !!id });

export function useSaveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: StudentInput & { id?: string }): Promise<CreatedStudent> => (id ? studentsApi.update(id, body) : studentsApi.create(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
