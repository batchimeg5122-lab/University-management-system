import { z } from 'zod';

/** Зөвшөөрөгдөх файлын төрлүүд */
export const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
];

export const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export const uploadUrlSchema = z.object({
  file_name: z.string().trim().min(1, 'Файлын нэр оруулна уу').max(200),
  mime_type: z.string().trim().min(3, 'Файлын төрөл тодорхойгүй байна'),
  size_bytes: z.coerce.number().int().positive('Файл хоосон байна').max(MAX_SIZE, 'Файлын хэмжээ 50MB-аас хэтэрсэн байна'),
});

export const createMaterialSchema = z.object({
  title: z.string().trim().min(2, 'Гарчиг оруулна уу').max(200),
  description: z.string().trim().max(1000).optional().nullable().or(z.literal('').transform(() => null)),
  file_path: z.string().trim().min(3),
  file_name: z.string().trim().min(1).max(200),
  mime_type: z.string().trim().optional().nullable(),
  size_bytes: z.coerce.number().int().min(0).max(MAX_SIZE),
  is_published: z.boolean().default(true),
});

export const updateMaterialSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(1000).nullable().or(z.literal('').transform(() => null)),
    is_published: z.boolean(),
  })
  .partial();
