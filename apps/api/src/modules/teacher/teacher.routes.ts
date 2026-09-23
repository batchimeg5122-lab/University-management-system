import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import * as c from './teacher.controller';

export const teacherRoutes = Router();

teacherRoutes.get('/teacher/dashboard', requireRole('teacher'), c.dashboard);
