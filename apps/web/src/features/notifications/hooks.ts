import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './api';
import type { Notification } from '@/types/models';

export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.list() });
export const useAnnouncements = () => useQuery({ queryKey: ['notifications', 'announcements'], queryFn: () => notificationsApi.list('announcements') });

export function useNotificationActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    markRead: useMutation({ mutationFn: notificationsApi.markRead, onSuccess: done }),
    markAllRead: useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: done }),
    create: useMutation({ mutationFn: (b: Partial<Notification>) => notificationsApi.create(b), onSuccess: done }),
    update: useMutation({ mutationFn: ({ id, ...b }: Partial<Notification> & { id: string }) => notificationsApi.update(id, b), onSuccess: done }),
    remove: useMutation({ mutationFn: notificationsApi.remove, onSuccess: done }),
  };
}
