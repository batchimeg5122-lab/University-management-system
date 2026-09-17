import { z } from 'zod';
import { ROLES } from '../../utils/constants';

const optionalText = z.string().trim().optional().nullable().or(z.literal('').transform(() => null));
const optionalPassword = z
  .string()
  .min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт')
  .max(72, 'Нууц үг хэт урт байна')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const listUsersQuery = z.object({
  q: z.string().optional(),
  role: z.enum(ROLES).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).optional().or(z.literal('')),
});

export const createUserSchema = z.object({
  last_name: z.string().trim().min(1, 'Овог оруулна уу'),
  first_name: z.string().trim().min(1, 'Нэр оруулна уу'),
  email: z.string().trim().toLowerCase().email('И-мэйл буруу байна'),
  phone: optionalText,
  role: z.enum(ROLES),
  password: optionalPassword,
});

/** Админ хэрэглэгчийн бүх мэдээллийг (оюутан/ажилтны профайлтай хамт) нэг дор засна */
export const updateUserSchema = z.object({
  last_name: z.string().trim().min(1, 'Овог хоосон байж болохгүй').optional(),
  first_name: z.string().trim().min(1, 'Нэр хоосон байж болохгүй').optional(),
  email: z.string().trim().toLowerCase().email('И-мэйл буруу байна').optional(),
  phone: optionalText,
  role: z.enum(ROLES).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),

  student: z
    .object({
      student_code: z.string().trim().min(3, 'Оюутны код хэт богино').transform((v) => v.toUpperCase()),
      register_number: optionalText,
      class_id: z.string().uuid('Анги сонгоно уу'),
      enrollment_year: z.coerce.number().int().min(2000).max(2100),
      status: z.enum(['active', 'leave', 'graduated', 'withdrawn', 'suspended']),
    })
    .partial()
    .optional(),

  employee: z
    .object({
      employee_code: z.string().trim().min(2, 'Ажилтны код хэт богино').transform((v) => v.toUpperCase()),
      employee_type: z.enum(['teacher', 'academic', 'finance', 'management', 'admin']),
      department_id: z.string().uuid().nullable().or(z.literal('').transform(() => null)),
      position: optionalText,
      specialization: optionalText,
      academic_degree: optionalText,
      is_active: z.boolean(),
    })
    .partial()
    .optional(),
});

export const resetPasswordSchema = z.object({
  /** Хоосон бол автоматаар үүсгэнэ */
  password: optionalPassword,
  /** Дараагийн нэвтрэлтэд нууц үг солихыг шаардах тэмдэглэгээ */
  must_change: z.boolean().default(true),
});
