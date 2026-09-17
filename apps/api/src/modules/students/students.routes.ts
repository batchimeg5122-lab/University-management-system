import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import { STAFF } from '../../utils/constants';
import * as c from './students.controller';
import { createStudentSchema, listStudentsQuery, updateStudentSchema } from './students.schema';

export const studentsRoutes = Router();

studentsRoutes.get('/students', requireRole(...STAFF), validate({ query: listStudentsQuery }), c.list);
studentsRoutes.get('/students/:id', c.detail); // оюутан өөрийнхөө, ажилтнууд бүгдийг
studentsRoutes.post('/students', requireRole('academic'), validate({ body: createStudentSchema }), c.create);
studentsRoutes.patch('/students/:id', requireRole('academic'), validate({ body: updateStudentSchema }), c.update);
