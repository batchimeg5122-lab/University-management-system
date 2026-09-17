import { z } from 'zod';

const nullableUuid = z.string().uuid().optional().nullable().or(z.literal('').transform(() => null));

export const listClassesQuery = z.object({ program_id: z.string().uuid().optional().or(z.literal('')) });

export const createClassSchema = z.object({
  code: z.string().trim().min(2, 'Ангийн код оруулна уу').transform((v) => v.toUpperCase()),
  name: z.string().trim().optional(),
  program_id: z.string().uuid('Хөтөлбөр сонгоно уу'),
  year_level: z.coerce.number().int().min(1).max(8),
  advisor_id: nullableUuid,
});

export const updateClassSchema = createClassSchema.partial();
