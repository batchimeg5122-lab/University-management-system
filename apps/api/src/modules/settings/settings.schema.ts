import { z } from 'zod';

const gradeRow = z.object({
  min: z.coerce.number().min(0).max(100),
  letter: z.string().trim().min(1).max(3),
  point: z.coerce.number().min(0).max(4),
});

/** Тохиргоо бүрийн бүтэц (key → schema) */
export const SETTING_SCHEMAS = {
  grading: z.object({
    scale: z
      .array(gradeRow)
      .min(2)
      .max(20)
      .refine((rows) => rows.some((r) => r.min === 0), 'Хамгийн доод мөр 0 онооноос эхлэх ёстой')
      .refine((rows) => new Set(rows.map((r) => r.min)).size === rows.length, 'Доод оноо давхардаж болохгүй'),
  }),
  security: z.object({
    /** Админ, удирдлага, сургалт, санхүүгийн ажилтнуудад 2FA заавал */
    require_staff_mfa: z.boolean(),
    /** Платформ тус бүрт НЭГ идэвхтэй нэвтрэлт (web-д нэг, mobile-д нэг) */
    single_session: z.boolean().default(false),
    /** Хэнд үйлчлэх — хоосон бол бүх эрхэд */
    single_session_roles: z.array(z.enum(['super_admin', 'management', 'academic', 'finance', 'teacher', 'student'])).default([]),
  }),
  finance: z.object({
    auto_remind: z.boolean(),
    remind_days_before: z.coerce.number().int().min(1).max(14),
    overdue_repeat_days: z.coerce.number().int().min(1).max(30),
  }),
  general: z.object({
    university_name: z.string().trim().min(2).max(120),
    academic_office_phone: z.string().trim().max(40).optional().nullable(),
    support_email: z.string().trim().email().optional().nullable().or(z.literal('').transform(() => null)),
  }),
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;
export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[];
