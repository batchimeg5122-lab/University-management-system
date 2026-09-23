import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './calendar.controller';
import { eventSchema, listEventsQuery, updateEventSchema } from './calendar.schema';

export const calendarRoutes = Router();

calendarRoutes.get('/calendar', validate({ query: listEventsQuery }), c.list);
calendarRoutes.post('/calendar', requireRole('academic'), validate({ body: eventSchema }), c.create);
calendarRoutes.patch('/calendar/:id', requireRole('academic'), validate({ body: updateEventSchema }), c.update);
calendarRoutes.delete('/calendar/:id', requireRole('academic'), c.remove);
