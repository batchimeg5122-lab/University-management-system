import { get, patch, post } from './client';
import type { MobileSession, UploadUrlResult } from '../types/models';

export const authApi = {
  me: () => get<MobileSession>('/auth/me'),
  /** Оюутны код / ажилтны код → нэвтрэх и-мэйл */
  lookup: (identifier: string) => post<{ email: string }>('/auth/lookup', { identifier }),
  updateMe: (body: { phone?: string | null; avatar_path?: string | null }) => patch<MobileSession>('/auth/me', body),
  avatarUploadUrl: (body: { mime_type: string; size_bytes: number }) => post<UploadUrlResult>('/auth/me/avatar-upload-url', body),
};
