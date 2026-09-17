import { Router } from 'express';
import { requireCourseAccess } from '../../middleware/course-access.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './enrollments.controller';
import { addEnrollmentsSchema } from './enrollments.schema';

export const enrollmentsRoutes = Router();

enrollmentsRoutes.get('/courses/:id/enrollments', requireCourseAccess(), c.listByCourse);
enrollmentsRoutes.post('/courses/:id/enrollments', requireRole('academic'), validate({ body: addEnrollmentsSchema }), c.add);
