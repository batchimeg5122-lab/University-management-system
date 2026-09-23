import { z } from 'zod';

export const lookupSchema = z.object({
  identifier: z.string().trim().min(3, 'Оюутны код эсвэл ажилтны кодоо оруулна уу'),
});

/** Хэрэглэгч өөрөө өөрчилж болох мэдээлэл (утас, профайл зураг) */
export const updateMeSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(/^(\+?976)?[0-9]{8}$/, 'Утасны дугаар 8 оронтой байна')
      .nullable()
      .or(z.literal('').transform(() => null)),
    /** avatar-upload-url-аар байршуулсан файлын зам */
    avatar_path: z.string().trim().min(3).max(300).nullable(),
  })
  .partial()
  .refine((v) => v.phone !== undefined || v.avatar_path !== undefined, 'Өөрчлөх мэдээлэл алга');

export const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX = 5 * 1024 * 1024;

export const avatarUploadSchema = z.object({
  mime_type: z.enum(AVATAR_MIME, { errorMap: () => ({ message: 'Зөвхөн JPG, PNG, WEBP зураг' }) }),
  size_bytes: z.coerce.number().int().positive().max(AVATAR_MAX, 'Зургийн хэмжээ 5MB-аас хэтэрсэн байна'),
});
