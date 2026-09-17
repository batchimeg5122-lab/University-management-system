import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './semesters.controller';
import { createSemesterSchema } from './semesters.schema';

export const semestersRoutes = Router();

semestersRoutes.get('/semesters', c.list);
semestersRoutes.get('/semesters/current', c.current);
semestersRoutes.post('/semesters', requireRole('academic'), validate({ body: createSemesterSchema }), c.create);
semestersRoutes.post('/semesters/:id/set-current', requireRole('academic'), c.setCurrent);
