import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './schedules.controller';
import { conflictsQuery, createScheduleSchema, listSchedulesQuery, updateScheduleSchema } from './schedules.schema';

export const schedulesRoutes = Router();

// Багш, оюутанд service өөрөө зөвхөн өөрийнх нь хуваарийг буцаана
schedulesRoutes.get('/schedules', validate({ query: listSchedulesQuery }), c.list);
schedulesRoutes.get('/schedules/conflicts', requireRole('academic', 'management'), validate({ query: conflictsQuery }), c.conflicts);
schedulesRoutes.post('/schedules', requireRole('academic'), validate({ body: createScheduleSchema }), c.create);
schedulesRoutes.patch('/schedules/:id', requireRole('academic'), validate({ body: updateScheduleSchema }), c.update);
schedulesRoutes.delete('/schedules/:id', requireRole('academic'), c.remove);
