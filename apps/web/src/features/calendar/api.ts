import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from '@/lib/api';
import type { UserRole } from '@/types/models';

export type EventType = 'holiday' | 'exam_week' | 'registration' | 'break' | 'deadline' | 'event';
export interface AcademicEvent {
  id: string;
  title: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  description: string | null;
  target_role: UserRole | null;
}
export type EventInput = Omit<AcademicEvent, 'id'> & { notify?: boolean };

export const EVENT_TYPE: Record<EventType, { label: string; color: string; soft: string }> = {
  holiday: { label: 'Амралтын өдөр', color: '#B42318', soft: '#FDECEA' },
  break: { label: 'Амралт', color: '#B54708', soft: '#FEF4E6' },
  exam_week: { label: 'Шалгалтын долоо хоног', color: '#6E3FB0', soft: '#F1EAFB' },
  registration: { label: 'Бүртгэл', color: '#1E4B8F', soft: '#EAF0F9' },
  deadline: { label: 'Эцсийн хугацаа', color: '#B8862B', soft: '#FBF3E3' },
  event: { label: 'Арга хэмжээ', color: '#1F7A4D', soft: '#E7F4EC' },
};

export const calendarApi = {
  list: (from: string, to: string) => get<AcademicEvent[]>('/calendar', { from, to }),
  create: (b: EventInput) => post<AcademicEvent>('/calendar', b),
  update: (id: string, b: Partial<EventInput>) => patch<AcademicEvent>(`/calendar/${id}`, b),
  remove: (id: string) => del<{ deleted: boolean }>(`/calendar/${id}`),
};

export const useEvents = (from: string, to: string) => useQuery({ queryKey: ['calendar', from, to], queryFn: () => calendarApi.list(from, to), placeholderData: (p) => p });

export function useSaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...b }: EventInput & { id?: string }) => (id ? calendarApi.update(id, b) : calendarApi.create(b)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: calendarApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }) });
}
