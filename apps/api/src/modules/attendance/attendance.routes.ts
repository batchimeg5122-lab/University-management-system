import { Router } from 'express';
import { requireCourseAccess } from '../../middleware/course-access.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './attendance.controller';
import { attendanceQuery, saveAttendanceSchema } from './attendance.schema';

export const attendanceRoutes = Router();

attendanceRoutes.get('/courses/:id/attendance', requireCourseAccess(), validate({ query: attendanceQuery }), c.byCourse);
attendanceRoutes.get('/courses/:id/attendance-dates', requireCourseAccess(), c.dates);
attendanceRoutes.put('/courses/:id/attendance', requireRole('teacher'), requireCourseAccess(), validate({ body: saveAttendanceSchema }), c.save);
attendanceRoutes.get('/attendance/me', requireRole('student'), c.mine);
