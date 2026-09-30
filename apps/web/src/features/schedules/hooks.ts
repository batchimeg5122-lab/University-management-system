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

/** Цуцлагдсан хичээлүүд */
export const useClassCancellations = (params: { from?: string; to?: string; course_id?: string } = {}, enabled = true) =>
  useQuery({ queryKey: ['schedules', 'cancellations', params], queryFn: () => schedulesApi.cancellations(params), enabled });

function useCancelInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['schedules'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['teacher'] });
  };
}

/** Багш тухайн өдрийн хичээлээ цуцлах */
export function useCancelClass() {
  const done = useCancelInvalidate();
  return useMutation({
    mutationFn: ({ id, date, reason }: { id: string; date: string; reason?: string | null }) => schedulesApi.cancelClass(id, { date, reason }),
    onSuccess: done,
  });
}

/** Цуцлалтыг буцаах */
export function useRestoreClass() {
  const done = useCancelInvalidate();
  return useMutation({ mutationFn: ({ id, date }: { id: string; date: string }) => schedulesApi.restoreClass(id, date), onSuccess: done });
}
