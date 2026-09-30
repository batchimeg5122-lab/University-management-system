import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './teacher.controller';
import { workloadQuery } from './teacher.schema';

export const teacherRoutes = Router();

teacherRoutes.get('/teacher/dashboard', requireRole('teacher'), c.dashboard);

// Хичээлийн цагийн тайлан — багш зөвхөн өөрийнхөө (service шалгана)
teacherRoutes.get('/teacher/workload', requireRole('teacher', 'academic', 'management'), validate({ query: workloadQuery }), c.workload);
// Бүх багшийн ачааллын хураангуй
teacherRoutes.get('/teacher/workload/all', requireRole('academic', 'management'), validate({ query: workloadQuery }), c.workloadByTeacher);
