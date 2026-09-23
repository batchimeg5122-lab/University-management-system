import { del, get, patch, post } from './client';
import type { CourseMaterial, MaterialStats, SignedFile, UploadUrlResult } from '../types/models';

export type MaterialInput = { title: string; description?: string | null; is_published?: boolean };

export const materialApi = {
  mine: () => get<CourseMaterial[]>('/materials/me'),
  byCourse: (courseId: string) => get<CourseMaterial[]>(`/courses/${courseId}/materials`),
  downloadUrl: (id: string) => get<SignedFile>(`/materials/${id}/download`),
  viewUrl: (id: string) => get<SignedFile>(`/materials/${id}/view`),
  uploadUrl: (courseId: string, body: { file_name: string; mime_type: string; size_bytes: number }) =>
    post<UploadUrlResult>(`/courses/${courseId}/materials/upload-url`, body),
  create: (courseId: string, body: MaterialInput & { file_path: string; file_name: string; mime_type: string; size_bytes: number }) =>
    post<CourseMaterial>(`/courses/${courseId}/materials`, body),
  update: (id: string, body: Partial<MaterialInput>) => patch<CourseMaterial>(`/materials/${id}`, body),
  remove: (id: string) => del<{ deleted: boolean }>(`/materials/${id}`),
  stats: (courseId: string) => get<MaterialStats>(`/courses/${courseId}/materials/stats`),
};
