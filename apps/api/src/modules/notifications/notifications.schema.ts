import { z } from 'zod';
import { ROLES } from '../../utils/constants';

export const listNotificationsQuery = z.object({ scope: z.enum(['announcements']).optional() });

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Гарчиг оруулна уу').max(200),
  message: z.string().trim().min(3, 'Агуулга оруулна уу'),
  target_role: z.enum(ROLES).optional().nullable().or(z.literal('').transform(() => null)),
  image_url: z.string().url().optional().nullable(),
  is_published: z.boolean().default(true),
  publish_at: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  expire_at: z.string().optional().nullable().or(z.literal('').transform(() => null)),
});

export const updateNotificationSchema = z.object({
  is_read: z.boolean().optional(),
  is_published: z.boolean().optional(),
  title: z.string().trim().min(3).optional(),
  message: z.string().trim().min(3).optional(),
});
