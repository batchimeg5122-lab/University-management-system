import { Router } from 'express';
import { requireCourseAccess } from '../../middleware/course-access.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { STAFF } from '../../utils/constants';
import * as c from './reports.controller';
import { departmentsReportQuery, financeReportQuery } from './reports.schema';

export const reportsRoutes = Router();

reportsRoutes.get('/reports/overview', requireRole(...STAFF), c.overview);
reportsRoutes.get('/reports/schools', requireRole(...STAFF), c.schools);
reportsRoutes.get('/reports/departments', requireRole(...STAFF), validate({ query: departmentsReportQuery }), c.departments);
reportsRoutes.get('/reports/courses/:id', requireCourseAccess(), c.course);
reportsRoutes.get('/reports/finance', requireRole('finance', 'management'), validate({ query: financeReportQuery }), c.finance);
reportsRoutes.get('/reports/student-summary', requireRole('student'), c.studentSummary);
