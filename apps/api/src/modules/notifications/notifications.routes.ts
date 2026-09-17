import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './notifications.controller';
import { createAnnouncementSchema, listNotificationsQuery, updateNotificationSchema } from './notifications.schema';

export const notificationsRoutes = Router();

notificationsRoutes.get('/notifications', validate({ query: listNotificationsQuery }), c.list);
notificationsRoutes.post('/notifications/read-all', c.readAll);
notificationsRoutes.post('/notifications', requireRole('academic', 'management'), validate({ body: createAnnouncementSchema }), c.create);
notificationsRoutes.patch('/notifications/:id', validate({ body: updateNotificationSchema }), c.update);
notificationsRoutes.delete('/notifications/:id', requireRole('academic', 'management'), c.remove);
