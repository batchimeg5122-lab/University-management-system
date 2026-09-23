import { get, patch, post } from './client';
import type { Notification } from '../types/models';

export const notificationApi = {
  list: () => get<Notification[]>('/notifications'),
  markRead: (id: string) => patch<Notification>(`/notifications/${id}`, { is_read: true }),
  markAllRead: () => post<{ ok: boolean }>('/notifications/read-all'),
};
