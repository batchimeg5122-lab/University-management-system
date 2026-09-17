import { Router } from 'express';
import { requireCourseAccess } from '../../middleware/course-access.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './grades.controller';
import { approveSchema, rejectSchema, saveGradesSchema } from './grades.schema';

export const gradesRoutes = Router();

gradesRoutes.get('/courses/:id/grade-items', requireCourseAccess(), c.items);
gradesRoutes.put('/courses/:id/grades', requireRole('teacher', 'academic'), requireCourseAccess(), validate({ body: saveGradesSchema }), c.save);
gradesRoutes.post('/courses/:id/grades/submit', requireRole('teacher'), requireCourseAccess(), c.submit);

gradesRoutes.get('/grades/pending', requireRole('academic', 'management'), c.pending);
gradesRoutes.post('/grades/approve', requireRole('academic'), validate({ body: approveSchema }), c.approve);
gradesRoutes.post('/grades/reject', requireRole('academic'), validate({ body: rejectSchema }), c.reject);
gradesRoutes.get('/grades/me', requireRole('student'), c.mine);
