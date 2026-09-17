import { z } from 'zod';

export const addEnrollmentsSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1, 'Оюутан сонгоно уу'),
});
