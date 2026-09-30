import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './schedules.controller';
import {
  cancelClassSchema,
  cancellationsQuery,
  conflictsQuery,
  createScheduleSchema,
  listSchedulesQuery,
  restoreClassQuery,
  suggestionsQuery,
  updateScheduleSchema,
} from './schedules.schema';

export const schedulesRoutes = Router();

// Багш, оюутанд service өөрөө зөвхөн өөрийнх нь хуваарийг буцаана
schedulesRoutes.get('/schedules', validate({ query: listSchedulesQuery }), c.list);
schedulesRoutes.get('/schedules/conflicts', requireRole('academic', 'management'), validate({ query: conflictsQuery }), c.conflicts);
// Сонгосон хичээлд тохирох сул цагууд
schedulesRoutes.get('/schedules/suggestions', requireRole('academic'), validate({ query: suggestionsQuery }), c.suggestions);
// Цуцлагдсан хичээлүүд — багш/оюутан өөрийнх, алба бүгдийг харна
schedulesRoutes.get('/schedules/cancellations', validate({ query: cancellationsQuery }), c.cancellations);
// Тухайн өдрийн хичээлийг цуцлах / буцаах — хичээлийн багш өөрөө, эсвэл Сургалтын алба
schedulesRoutes.post('/schedules/:id/cancel', requireRole('teacher', 'academic'), validate({ body: cancelClassSchema }), c.cancelClass);
schedulesRoutes.delete('/schedules/:id/cancel', requireRole('teacher', 'academic'), validate({ query: restoreClassQuery }), c.restoreClass);

schedulesRoutes.post('/schedules', requireRole('academic'), validate({ body: createScheduleSchema }), c.create);
schedulesRoutes.patch('/schedules/:id', requireRole('academic'), validate({ body: updateScheduleSchema }), c.update);
schedulesRoutes.delete('/schedules/:id', requireRole('academic'), c.remove);
