import { z } from 'zod';

export const saveGradesSchema = z.object({
  rows: z
    .array(
      z.object({
        enrollment_id: z.string().uuid(),
        scores: z.record(z.string(), z.coerce.number().min(0, 'Оноо сөрөг байж болохгүй')),
      }),
    )
    .min(1),
});

export const approveSchema = z.object({ course_id: z.string().uuid() });
export const rejectSchema = z.object({
  course_id: z.string().uuid(),
  reason: z.string().trim().min(3, 'Буцаах шалтгаанаа бичнэ үү'),
});
