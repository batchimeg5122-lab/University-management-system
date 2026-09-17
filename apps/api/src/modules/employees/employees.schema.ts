import { z } from 'zod';

const type = z.enum(['teacher', 'academic', 'finance', 'management', 'admin']);
const optionalText = z.string().trim().optional().nullable().or(z.literal('').transform(() => null));
const nullableUuid = z.string().uuid().optional().nullable().or(z.literal('').transform(() => null));

export const listEmployeesQuery = z.object({
  q: z.string().optional(),
  type: type.optional().or(z.literal('')),
  department_id: z.string().uuid().optional().or(z.literal('')),
});

export const createEmployeeSchema = z.object({
  last_name: z.string().trim().min(1, 'Овог оруулна уу'),
  first_name: z.string().trim().min(1, 'Нэр оруулна уу'),
  employee_code: z.string().trim().min(2, 'Ажилтны код оруулна уу').transform((v) => v.toUpperCase()),
  employee_type: type,
  email: z.string().trim().email('Нэвтрэхэд и-мэйл шаардлагатай'),
  phone: optionalText,
  department_id: nullableUuid,
  position: optionalText,
  specialization: optionalText,
  academic_degree: optionalText,
  hired_at: optionalText,
  password: z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт').optional().or(z.literal('').transform(() => undefined)),
});

export const updateEmployeeSchema = z.object({
  department_id: nullableUuid,
  position: optionalText,
  specialization: optionalText,
  academic_degree: optionalText,
  is_active: z.boolean().optional(),
});
