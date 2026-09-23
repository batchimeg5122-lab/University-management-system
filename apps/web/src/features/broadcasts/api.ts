import { del, get, post } from '@/lib/api';
import type { UserRole } from '@/types/models';

export type AudienceKind = 'all' | 'role' | 'school' | 'program' | 'class' | 'course';
export interface Audience {
  kind: AudienceKind;
  role?: UserRole | null;
  ids: string[];
  include_teachers: boolean;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  audience: Audience;
  audience_label: string | null;
  send_push: boolean;
  publish_at: string | null;
  pushed_at: string | null;
  recipient_count: number;
  read_count: number;
  status: 'sent' | 'scheduled';
  created_by_name: string | null;
  created_at: string;
}

export const broadcastsApi = {
  list: () => get<Broadcast[]>('/broadcasts'),
  preview: (audience: Audience) => post<{ count: number; label: string }>('/broadcasts/preview', { audience }),
  create: (body: { title: string; message: string; audience: Audience; send_push: boolean; publish_at?: string | null }) => post<Broadcast>('/broadcasts', body),
  remove: (id: string) => del<{ deleted: boolean }>(`/broadcasts/${id}`),
};
