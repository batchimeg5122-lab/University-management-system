import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, type ScheduleFilters, type ScheduleInput } from './api';

export const useSchedules = (filters: ScheduleFilters, enabled = true) =>
  useQuery({ queryKey: ['schedules', filters], queryFn: () => schedulesApi.list(filters), enabled });

export const useScheduleConflicts = (semesterId?: string, enabled = true) =>
  useQuery({ queryKey: ['schedules', 'conflicts', semesterId], queryFn: () => schedulesApi.conflicts(semesterId), enabled });

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['schedules'] });
}

export function useCreateSchedule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (b: ScheduleInput) => schedulesApi.create(b), onSuccess: done });
}

export function useUpdateSchedule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: ({ id, ...b }: Partial<ScheduleInput> & { id: string }) => schedulesApi.update(id, b), onSuccess: done });
}

export function useDeleteSchedule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (id: string) => schedulesApi.remove(id), onSuccess: done });
}
