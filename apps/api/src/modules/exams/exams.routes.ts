import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './exams.controller';
import { createExamSchema, listExamsQuery, updateExamSchema } from './exams.schema';

export const examsRoutes = Router();

// Оюутан, багшид service өөрөө зөвхөн өөрт хамаатайг буцаана
examsRoutes.get('/exams', validate({ query: listExamsQuery }), c.list);
examsRoutes.post('/exams', requireRole('academic', 'teacher'), validate({ body: createExamSchema }), c.create);
examsRoutes.patch('/exams/:id', requireRole('academic', 'teacher'), validate({ body: updateExamSchema }), c.update);
examsRoutes.delete('/exams/:id', requireRole('academic', 'teacher'), c.remove);
