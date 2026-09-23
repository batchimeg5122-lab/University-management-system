import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Огноо YYYY-MM-DD');
export const EVENT_TYPES = ['holiday', 'exam_week', 'registration', 'break', 'deadline', 'event'] as const;
const ROLES = ['super_admin', 'management', 'academic', 'finance', 'teacher', 'student'] as const;

const base = z.object({
  title: z.string().trim().min(2, 'Гарчиг оруулна уу').max(200),
  event_type: z.enum(EVENT_TYPES).default('event'),
  start_date: date,
  end_date: date,
  description: z.string().trim().max(2000).optional().nullable(),
  target_role: z.enum(ROLES).optional().nullable().or(z.literal('').transform(() => null)),
  semester_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  /** Үүсгэхэд хэрэглэгчдэд мэдэгдэх эсэх */
  notify: z.boolean().optional(),
});

export const eventSchema = base.refine((v) => v.end_date >= v.start_date, { message: 'Дуусах огноо эхлэхээс өмнө байж болохгүй', path: ['end_date'] });
export const updateEventSchema = base.partial();

export const listEventsQuery = z.object({
  from: date.optional().or(z.literal('')),
  to: date.optional().or(z.literal('')),
});
