import { z } from 'zod';

const status = z.enum(['active', 'leave', 'graduated', 'withdrawn', 'suspended']);
const optionalText = z.string().trim().optional().nullable().or(z.literal('').transform(() => null));

export const listStudentsQuery = z.object({
  q: z.string().optional(),
  status: status.optional().or(z.literal('')),
  class_id: z.string().uuid().optional().or(z.literal('')),
  program_id: z.string().uuid().optional().or(z.literal('')),
});

export const createStudentSchema = z.object({
  last_name: z.string().trim().min(1, 'Овог оруулна уу'),
  first_name: z.string().trim().min(1, 'Нэр оруулна уу'),
  student_code: z.string().trim().min(3, 'Оюутны код оруулна уу').transform((v) => v.toUpperCase()),
  register_number: optionalText,
  email: z.string().trim().email('И-мэйл хаяг буруу байна').optional().or(z.literal('').transform(() => undefined)),
  phone: optionalText,
  class_id: z.string().uuid('Анги сонгоно уу'),
  enrollment_year: z.coerce.number().int().min(2000).max(2100).optional(),
  password: z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт').optional().or(z.literal('').transform(() => undefined)),
});

export const updateStudentSchema = z.object({
  last_name: z.string().trim().min(1).optional(),
  first_name: z.string().trim().min(1).optional(),
  phone: optionalText,
  register_number: optionalText,
  class_id: z.string().uuid().optional(),
  enrollment_year: z.coerce.number().int().optional(),
  status: status.optional(),
});
