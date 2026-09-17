import { z } from 'zod';

export const lookupSchema = z.object({
  identifier: z.string().trim().min(3, 'Оюутны код эсвэл ажилтны кодоо оруулна уу'),
});
