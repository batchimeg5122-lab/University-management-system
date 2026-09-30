import { z } from 'zod';

const uuidOrEmpty = z.string().uuid().optional().or(z.literal(''));

/** Хичээлийн цагийн тайлан. Багш нар зөвхөн өөрийнхөө — teacher_id үл хэрэгсэгдэнэ. */
export const workloadQuery = z.object({
  teacher_id: uuidOrEmpty,
  semester_id: uuidOrEmpty,
  /** Улирлын долоо хоногийн тоо (анхдагч: улирлын хугацаанаас бодно) */
  weeks: z.coerce.number().int().min(1).max(30).optional(),
});
