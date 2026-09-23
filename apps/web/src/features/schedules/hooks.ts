import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, type ScheduleFilters, type ScheduleInput } from './api';

export const useSchedules = (filters: ScheduleFilters, enabled = true) =>
  useQuery({ queryKey: ['schedules', filters], queryFn: () => schedulesApi.list(filters), enabled });

export const useScheduleConflicts = (semesterId?: string, enabled = true) =>
  useQuery({ queryKey: ['schedules', 'conflicts', semesterId], queryFn: () => schedulesApi.conflicts(semesterId), enabled });

/** Сонгосон хичээлд тохирох сул цагууд */
export const useSlotSuggestions = (courseIds: string[], enabled: boolean) =>
  useQuery({
    queryKey: ['schedules', 'suggestions', courseIds],
    queryFn: () => schedulesApi.suggestions(courseIds),
    enabled: enabled && courseIds.length > 0,
  });

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['schedules'] });
    qc.invalidateQueries({ queryKey: ['rooms'] });
  };
}

export function useCreateSchedule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (b: ScheduleInput) => schedulesApi.create(b), onSuccess: done });
}

export function useUpdateSchedule() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...b }: Partial<Omit<ScheduleInput, 'course_ids'>> & { id: string; course_id?: string }) => schedulesApi.update(id, b),
    onSuccess: done,
  });
}

export function useDeleteSchedule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: ({ id, withGroup }: { id: string; withGroup?: boolean }) => schedulesApi.remove(id, withGroup), onSuccess: done });
}
