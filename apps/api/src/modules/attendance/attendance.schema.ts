import { z } from 'zod';
import { localDate } from '../../utils/local-date';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Огноо YYYY-MM-DD хэлбэртэй байна');

export const attendanceQuery = z.object({ date: date.optional() });

export const saveAttendanceSchema = z.object({
  date: date.refine((d) => d <= localDate(), 'Ирээдүйн огноонд ирц бүртгэх боломжгүй'), // Монголын цагаар (UTC+8)
  rows: z
    .array(
      z.object({
        student_id: z.string().uuid(),
        status: z.enum(['present', 'absent', 'late', 'sick', 'excused']),
        note: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(1, 'Ирцийн мэдээлэл хоосон байна'),
});
