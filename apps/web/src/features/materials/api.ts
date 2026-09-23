import { del, get, patch, post } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { CourseMaterial, MaterialAccessDetail, MaterialStats } from '@/types/models';

export const MAX_SIZE = 50 * 1024 * 1024;

export type SignedFile = { url: string; file_name: string; mime_type?: string | null; can_preview?: boolean; expires_in?: number };
export type UploadUrlResult = { path: string; token: string; signed_url: string; bucket: string };
export type MaterialInput = { title: string; description?: string | null; is_published?: boolean };

export const materialsApi = {
  byCourse: (courseId: string) => get<CourseMaterial[]>(`/courses/${courseId}/materials`),
  mine: () => get<CourseMaterial[]>('/materials/me'),
  uploadUrl: (courseId: string, body: { file_name: string; mime_type: string; size_bytes: number }) =>
    post<UploadUrlResult>(`/courses/${courseId}/materials/upload-url`, body),
  create: (courseId: string, body: MaterialInput & { file_path: string; file_name: string; mime_type: string; size_bytes: number }) =>
    post<CourseMaterial>(`/courses/${courseId}/materials`, body),
  update: (id: string, body: Partial<MaterialInput>) => patch<CourseMaterial>(`/materials/${id}`, body),
  remove: (id: string) => del<{ deleted: boolean }>(`/materials/${id}`),
  downloadUrl: (id: string) => get<SignedFile>(`/materials/${id}/download`),
  viewUrl: (id: string) => get<SignedFile>(`/materials/${id}/view`),
  courseStats: (courseId: string) => get<MaterialStats>(`/courses/${courseId}/materials/stats`),
  access: (id: string) => get<MaterialAccessDetail>(`/materials/${id}/access`),
};

/**
 * 1) Серверээс түр зөвшөөрөл авна
 * 2) Файлыг ШУУД Supabase Storage руу байршуулна (API-аар дамжуулахгүй)
 * 3) Мэдээллийг бүртгэнэ
 */
export async function uploadMaterial(courseId: string, file: File, meta: MaterialInput) {
  const signed = await materialsApi.uploadUrl(courseId, {
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  });

  if (env.dataSource !== 'mock') {
    if (!supabase) throw new Error('Supabase тохиргоо (.env) дутуу байна.');
    const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type || 'application/octet-stream',
    });
    if (error) throw new Error(`Файл байршуулж чадсангүй: ${error.message}`);
  }

  return materialsApi.create(courseId, {
    ...meta,
    file_path: signed.path,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  });
}

/** Татахгүйгээр үзэх түр холбоос авна (оюутны хандалт бүртгэгдэнэ) */
export const openMaterial = (id: string) => materialsApi.viewUrl(id);

/** Түр холбоосоор файлыг татна */
export async function downloadMaterial(id: string) {
  const { url, file_name } = await materialsApi.downloadUrl(id);
  const a = document.createElement('a');
  a.href = url;
  a.download = file_name;
  a.rel = 'noopener';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
