import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './programs.controller';
import { createProgramSchema, listProgramsQuery, updateProgramSchema } from './programs.schema';

export const programsRoutes = Router();

programsRoutes.get('/programs', validate({ query: listProgramsQuery }), c.list);
programsRoutes.post('/programs', requireRole('academic'), validate({ body: createProgramSchema }), c.create);
programsRoutes.patch('/programs/:id', requireRole('academic'), validate({ body: updateProgramSchema }), c.update);
