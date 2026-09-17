import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Огноо YYYY-MM-DD хэлбэртэй байна');

export const createSemesterSchema = z
  .object({
    academic_year: z.string().regex(/^\d{4}-\d{4}$/, 'Хичээлийн жил 2026-2027 хэлбэртэй байна'),
    name: z.string().trim().min(2),
    semester_number: z.coerce.number().int().min(1).max(3),
    start_date: date,
    end_date: date,
  })
  .refine((s) => s.end_date > s.start_date, { message: 'Дуусах огноо эхлэх огнооноос хойш байх ёстой', path: ['end_date'] });
