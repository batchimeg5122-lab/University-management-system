import { z } from 'zod';
import { ROLES } from '../../utils/constants';

export const audienceSchema = z
  .object({
    /** all — бүгд, role — эрхээр, school/program/class/course — сонгосон нэгжийн оюутнууд */
    kind: z.enum(['all', 'role', 'school', 'program', 'class', 'course']),
    role: z.enum(ROLES).optional().nullable(),
    ids: z.array(z.string().uuid()).max(200).default([]),
    /** Сонгосон нэгжийн багш нарыг ч оруулах */
    include_teachers: z.boolean().default(false),
  })
  .refine((a) => a.kind !== 'role' || !!a.role, 'Эрх (role) сонгоно уу')
  .refine((a) => ['all', 'role'].includes(a.kind) || a.ids.length > 0, 'Хамрах нэгжээ сонгоно уу');

export const previewSchema = z.object({ audience: audienceSchema });

export const createBroadcastSchema = z.object({
  title: z.string().trim().min(3, 'Гарчиг оруулна уу').max(200),
  message: z.string().trim().min(3, 'Агуулга оруулна уу').max(4000),
  audience: audienceSchema,
  send_push: z.boolean().default(true),
  /** ISO огноо — ирээдүйд бол товлоно */
  publish_at: z.string().datetime({ offset: true }).optional().nullable().or(z.literal('').transform(() => null)),
});

export type Audience = z.infer<typeof audienceSchema>;
