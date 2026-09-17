import { Router } from 'express';
import { requireCourseAccess } from '../../middleware/course-access.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './courses.controller';
import { createCourseSchema, listCoursesQuery, updateCourseSchema } from './courses.schema';

export const coursesRoutes = Router();

coursesRoutes.get('/courses', validate({ query: listCoursesQuery }), c.list);
coursesRoutes.get('/courses/:id', requireCourseAccess(), c.detail);
coursesRoutes.post('/courses', requireRole('academic'), validate({ body: createCourseSchema }), c.create);
coursesRoutes.patch('/courses/:id', requireRole('academic'), validate({ body: updateCourseSchema }), c.update);
