import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './classes.controller';
import { createClassSchema, listClassesQuery, updateClassSchema } from './classes.schema';

export const classesRoutes = Router();

classesRoutes.get('/classes', validate({ query: listClassesQuery }), c.list);
classesRoutes.post('/classes', requireRole('academic'), validate({ body: createClassSchema }), c.create);
classesRoutes.patch('/classes/:id', requireRole('academic'), validate({ body: updateClassSchema }), c.update);
