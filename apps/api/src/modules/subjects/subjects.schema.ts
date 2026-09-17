import { z } from 'zod';

const nullableUuid = z.string().uuid().optional().nullable().or(z.literal('').transform(() => null));

export const listSubjectsQuery = z.object({
  q: z.string().optional(),
  department_id: z.string().uuid().optional().or(z.literal('')),
});

export const createSubjectSchema = z.object({
  code: z.string().trim().min(2, 'Код оруулна уу').transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, 'Нэр оруулна уу'),
  credit: z.coerce.number().int().min(1).max(10),
  department_id: nullableUuid,
  program_id: nullableUuid,
  subject_type: z.enum(['mandatory', 'elective']).default('mandatory'),
  description: z.string().trim().optional().nullable(),
});

export const updateSubjectSchema = createSubjectSchema.omit({ code: true }).partial().extend({ is_active: z.boolean().optional() });
