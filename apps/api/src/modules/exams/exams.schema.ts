import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Огноо YYYY-MM-DD');
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Цаг HH:MM');
const optText = z.string().trim().max(200).optional().nullable().or(z.literal('').transform(() => null));

export const EXAM_TYPES = ['quiz', 'midterm', 'final', 'retake', 'other'] as const;

const base = z.object({
  course_id: z.string().uuid('Хичээл сонгоно уу'),
  title: z.string().trim().max(200).optional().nullable(),
  exam_type: z.enum(EXAM_TYPES).default('final'),
  exam_date: date,
  start_time: time,
  end_time: time,
  building: optText,
  room: optText,
  is_online: z.boolean().default(false),
  note: z.string().trim().max(1000).optional().nullable().or(z.literal('').transform(() => null)),
});

export const createExamSchema = base.refine((v) => v.end_time.slice(0, 5) > v.start_time.slice(0, 5), { message: 'Дуусах цаг эхлэх цагаас хойш байна', path: ['end_time'] });

export const updateExamSchema = base.omit({ course_id: true }).partial();

export const listExamsQuery = z.object({
  course_id: z.string().uuid().optional().or(z.literal('')),
  semester_id: z.string().uuid().optional().or(z.literal('')),
  from: date.optional().or(z.literal('')),
  upcoming: z.enum(['true', 'false']).optional(),
});
