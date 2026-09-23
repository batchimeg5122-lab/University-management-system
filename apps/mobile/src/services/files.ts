import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from '../api/auth.api';
import { materialApi, type MaterialInput } from '../api/material.api';
import { env } from '../constants/env';
import type { CourseMaterial, MobileSession } from '../types/models';
import { MATERIAL_MAX_SIZE, MATERIAL_MIME } from '../utils/constants';

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
};

/** Утас mimeType өгөхгүй бол өргөтгөлөөс таамаглана */
export function guessMime(name: string, given?: string | null): string {
  if (given && given !== 'application/octet-stream') return given;
  const ext = name.toLowerCase().split('.').pop() ?? '';
  return EXT_MIME[ext] ?? given ?? 'application/octet-stream';
}

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 150) || 'file';

/**
 * Signed URL руу файлыг шууд PUT хийнэ (API-аар дамжихгүй, санах ойд ачаалахгүй).
 * Supabase Storage-ийн `createSignedUploadUrl`-тай нийцнэ.
 */
async function putToSignedUrl(uri: string, signedUrl: string, mime: string) {
  const file = new File(uri);
  const result = await file.upload(signedUrl, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': mime, 'x-upsert': 'false', apikey: env.supabaseAnonKey },
  });
  if (result.status < 200 || result.status >= 300) {
    let message = '';
    try {
      message = (JSON.parse(result.body) as { message?: string; error?: string }).message ?? '';
    } catch {
      /* body JSON биш */
    }
    throw new Error(`Файл байршуулж чадсангүй${message ? `: ${message}` : ` (${result.status})`}.`);
  }
}

// ------------------------------------------------------------------ Материал (оюутан, багш)

/** Апп дотроос нээж үзэх (PDF, зураг) — хандалт бүртгэгдэнэ */
export async function openMaterial(m: Pick<CourseMaterial, 'id'>) {
  const signed = await materialApi.viewUrl(m.id);
  await WebBrowser.openBrowserAsync(signed.url);
}

/** Утсанд татаж, хуваалцах/хадгалах цонх нээнэ (§20) */
export async function downloadMaterial(m: Pick<CourseMaterial, 'id' | 'file_name' | 'mime_type'>) {
  const signed = await materialApi.downloadUrl(m.id);
  const dir = new Directory(Paths.cache, 'materials');
  dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, safeFileName(signed.file_name || m.file_name));
  const file = await File.downloadFileAsync(signed.url, target, { idempotent: true });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: signed.mime_type ?? m.mime_type ?? undefined, dialogTitle: signed.file_name });
  } else {
    await WebBrowser.openBrowserAsync(signed.url);
  }
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
}

/** Багш: файл шалгах → signed URL → Storage → бүртгэл (§33, §57) */
export async function uploadMaterial(courseId: string, picked: PickedFile, meta: MaterialInput) {
  const mime = guessMime(picked.name, picked.mimeType);
  const size = Number(picked.size ?? new File(picked.uri).size ?? 0);
  if (!MATERIAL_MIME.includes(mime)) throw new Error('Энэ төрлийн файл дэмжигдэхгүй (PDF, Word, PowerPoint, Excel, зураг, видео, ZIP).');
  if (!size) throw new Error('Файл хоосон байна.');
  if (size > MATERIAL_MAX_SIZE) throw new Error('Файлын хэмжээ 50MB-аас хэтэрсэн байна.');

  const signed = await materialApi.uploadUrl(courseId, { file_name: picked.name, mime_type: mime, size_bytes: size });
  await putToSignedUrl(picked.uri, signed.signed_url, mime);
  return materialApi.create(courseId, {
    ...meta,
    file_path: signed.path,
    file_name: picked.name,
    mime_type: mime,
    size_bytes: size,
  });
}

// ------------------------------------------------------------------ Профайл зураг

export async function uploadAvatar(picked: PickedFile): Promise<MobileSession> {
  const mime = guessMime(picked.name, picked.mimeType);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Зөвхөн JPG, PNG, WEBP зураг сонгоно уу.');
  const size = Number(picked.size ?? new File(picked.uri).size ?? 0);
  if (size > 5 * 1024 * 1024) throw new Error('Зургийн хэмжээ 5MB-аас хэтэрсэн байна.');

  const signed = await authApi.avatarUploadUrl({ mime_type: mime, size_bytes: size || 1 });
  await putToSignedUrl(picked.uri, signed.signed_url, mime);
  return authApi.updateMe({ avatar_path: signed.path });
}
