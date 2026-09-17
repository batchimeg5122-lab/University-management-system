import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './employees.controller';
import { createEmployeeSchema, listEmployeesQuery, updateEmployeeSchema } from './employees.schema';

export const employeesRoutes = Router();

employeesRoutes.get('/employees', requireRole('management', 'academic', 'finance'), validate({ query: listEmployeesQuery }), c.list);
employeesRoutes.post('/employees', requireRole('academic'), validate({ body: createEmployeeSchema }), c.create);
employeesRoutes.patch('/employees/:id', requireRole('academic'), validate({ body: updateEmployeeSchema }), c.update);
