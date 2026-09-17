import { z } from 'zod';

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Цаг HH:MM хэлбэртэй байна');
const uuidOrEmpty = z.string().uuid().optional().or(z.literal(''));

export const listSchedulesQuery = z.object({
  course_id: uuidOrEmpty,
  class_id: uuidOrEmpty,
  teacher_id: uuidOrEmpty,
  room: z.string().optional(),
  semester_id: uuidOrEmpty,
  mine: z.enum(['true', 'false']).optional(),
});

export const conflictsQuery = z.object({ semester_id: uuidOrEmpty });

const fields = {
  course_id: z.string().uuid('Хичээл сонгоно уу'),
  day_of_week: z.coerce.number().int().min(1, 'Гараг сонгоно уу').max(7),
  start_time: time,
  end_time: time,
  building: z.string().trim().optional().nullable(),
  room: z.string().trim().min(1, 'Өрөөний дугаар оруулна уу'),
};

const timeOrder = (s: { start_time?: string; end_time?: string }) =>
  !s.start_time || !s.end_time || s.end_time.slice(0, 5) > s.start_time.slice(0, 5);

export const createScheduleSchema = z.object(fields).refine(timeOrder, { message: 'Дуусах цаг эхлэх цагаас хойш байх ёстой', path: ['end_time'] });

export const updateScheduleSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Өөрчлөх утга алга' })
  .refine(timeOrder, { message: 'Дуусах цаг эхлэх цагаас хойш байх ёстой', path: ['end_time'] });
