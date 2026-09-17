import { z } from 'zod';

const nullableUuid = z.string().uuid().optional().nullable().or(z.literal('').transform(() => null));

export const listCoursesQuery = z.object({
  semester_id: z.string().uuid().optional().or(z.literal('')),
  class_id: z.string().uuid().optional().or(z.literal('')),
  teacher_id: z.string().uuid().optional().or(z.literal('')),
  mine: z.enum(['true', 'false']).optional(),
});

export const createCourseSchema = z.object({
  subject_id: z.string().uuid('Хичээл сонгоно уу'),
  semester_id: z.string().uuid('Улирал сонгоно уу'),
  class_id: z.string().uuid('Анги сонгоно уу'),
  teacher_id: nullableUuid,
  section: z.string().trim().optional(),
  max_students: z.coerce.number().int().min(1).max(500).optional(),
});

export const updateCourseSchema = z.object({
  teacher_id: nullableUuid,
  status: z.enum(['planned', 'active', 'completed', 'cancelled']).optional(),
  max_students: z.coerce.number().int().min(1).max(500).optional(),
});
