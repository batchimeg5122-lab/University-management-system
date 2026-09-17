import { z } from 'zod';

const level = z.enum(['campus', 'school', 'department']);

export const listDepartmentsQuery = z.object({
  level: level.optional().or(z.literal('')),
  parent_id: z.string().uuid().optional().or(z.literal('')),
});

export const createDepartmentSchema = z
  .object({
    name: z.string().trim().min(2, 'Нэр оруулна уу'),
    code: z.string().trim().optional().nullable(),
    level,
    parent_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
    head_name: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    email: z.string().trim().email().optional().nullable().or(z.literal('').transform(() => null)),
  })
  .refine((d) => d.level === 'campus' || !!d.parent_id, { message: 'Харьяалах нэгжийг сонгоно уу', path: ['parent_id'] });

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  code: z.string().trim().optional().nullable(),
  head_name: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});
