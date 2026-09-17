import { del, get, patch, post } from '@/lib/api';
import type { Notification } from '@/types/models';

export const notificationsApi = {
  list: (scope?: 'announcements') => get<Notification[]>('/notifications', { scope }),
  create: (body: Partial<Notification>) => post<Notification>('/notifications', body),
  update: (id: string, body: Partial<Notification>) => patch<Notification>(`/notifications/${id}`, body),
  markRead: (id: string) => patch<Notification>(`/notifications/${id}`, { is_read: true }),
  markAllRead: () => post<{ ok: boolean }>('/notifications/read-all'),
  remove: (id: string) => del<{ deleted: boolean }>(`/notifications/${id}`),
};
