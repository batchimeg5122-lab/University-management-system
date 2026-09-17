import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './departments.controller';
import { createDepartmentSchema, listDepartmentsQuery, updateDepartmentSchema } from './departments.schema';

export const departmentsRoutes = Router();

departmentsRoutes.get('/departments', validate({ query: listDepartmentsQuery }), c.list);
departmentsRoutes.post('/departments', requireRole('academic'), validate({ body: createDepartmentSchema }), c.create);
departmentsRoutes.patch('/departments/:id', requireRole('academic'), validate({ body: updateDepartmentSchema }), c.update);
