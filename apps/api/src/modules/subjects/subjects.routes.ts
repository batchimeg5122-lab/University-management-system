import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './subjects.controller';
import { createSubjectSchema, listSubjectsQuery, updateSubjectSchema } from './subjects.schema';

export const subjectsRoutes = Router();

subjectsRoutes.get('/subjects', validate({ query: listSubjectsQuery }), c.list);
subjectsRoutes.post('/subjects', requireRole('academic'), validate({ body: createSubjectSchema }), c.create);
subjectsRoutes.patch('/subjects/:id', requireRole('academic'), validate({ body: updateSubjectSchema }), c.update);
