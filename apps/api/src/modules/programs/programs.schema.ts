import { z } from 'zod';

export const listProgramsQuery = z.object({ department_id: z.string().uuid().optional().or(z.literal('')) });

const base = {
  name: z.string().trim().min(2, 'Нэр оруулна уу'),
  code: z.string().trim().optional().nullable(),
  department_id: z.string().uuid('Тэнхим сонгоно уу'),
  degree: z.string().trim().optional().nullable(),
  duration_years: z.coerce.number().int().min(1).max(8).optional().nullable(),
  total_credits: z.coerce.number().int().min(1).optional().nullable(),
};

export const createProgramSchema = z.object(base);
export const updateProgramSchema = z.object({ ...base, is_active: z.boolean() }).partial();
