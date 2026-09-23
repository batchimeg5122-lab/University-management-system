import { z } from 'zod';

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Цаг HH:MM хэлбэртэй байна');
const uuidOrEmpty = z.string().uuid().optional().or(z.literal(''));
const sessionType = z.enum(['lecture', 'seminar', 'lab', 'exam']);

export const listSchedulesQuery = z.object({
  course_id: uuidOrEmpty,
  class_id: uuidOrEmpty,
  teacher_id: uuidOrEmpty,
  room: z.string().optional(),
  semester_id: uuidOrEmpty,
  mine: z.enum(['true', 'false']).optional(),
});

export const conflictsQuery = z.object({ semester_id: uuidOrEmpty });

export const suggestionsQuery = z.object({
  course_ids: z.string().min(1, 'Хичээл сонгоно уу'), // таслалаар тусгаарласан
  building: z.string().optional(),
  room: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const base = {
  day_of_week: z.coerce.number().int().min(1, 'Гараг сонгоно уу').max(7),
  start_time: time,
  end_time: time,
  building: z.string().trim().optional().nullable(),
  room: z.string().trim().optional().nullable(),
  session_type: sessionType.default('lecture'),
  is_online: z.boolean().default(false),
  note: z.string().trim().max(300).optional().nullable(),
};

const timeOrder = (s: { start_time?: string; end_time?: string }) =>
  !s.start_time || !s.end_time || s.end_time.slice(0, 5) > s.start_time.slice(0, 5);

const roomRequired = (s: { is_online?: boolean; room?: string | null }) => s.is_online || !!s.room?.trim();

export const createScheduleSchema = z
  .object({
    ...base,
    /** Нэг хичээл, эсвэл НЭГДСЭН ЛЕКЦ бол хэд хэдэн хичээл (анги тус бүрийн) */
    course_ids: z.array(z.string().uuid()).min(1, 'Хичээл сонгоно уу').max(10, 'Хамгийн ихдээ 10 анги'),
  })
  .refine(timeOrder, { message: 'Дуусах цаг эхлэх цагаас хойш байх ёстой', path: ['end_time'] })
  .refine(roomRequired, { message: 'Танхимын хичээлд өрөө сонгоно уу', path: ['room'] })
  .refine((s) => s.course_ids.length === 1 || s.session_type === 'lecture' || s.session_type === 'exam', {
    message: 'Зөвхөн лекц, шалгалтыг хэд хэдэн ангид нэгтгэж болно',
    path: ['course_ids'],
  });

export const updateScheduleSchema = z
  .object({ ...base, course_id: z.string().uuid() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Өөрчлөх утга алга' })
  .refine(timeOrder, { message: 'Дуусах цаг эхлэх цагаас хойш байх ёстой', path: ['end_time'] });
