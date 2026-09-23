import { Router } from 'express';
import { requireCourseAccess } from '../../middleware/course-access.middleware';
import { requireCourseView } from '../../middleware/course-view.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './materials.controller';
import { createMaterialSchema, updateMaterialSchema, uploadUrlSchema } from './materials.schema';

export const materialsRoutes = Router();

// Оюутны бүх хичээлийн материал
materialsRoutes.get('/materials/me', requireRole('student'), c.listForStudent);

// Хичээлийн материал: багш өөрийн хичээл, оюутан бүртгэлтэй хичээлээ харна
materialsRoutes.get('/courses/:id/materials', requireCourseView(), c.listByCourse);
materialsRoutes.post('/courses/:id/materials/upload-url', requireRole('teacher', 'academic'), requireCourseAccess(), validate({ body: uploadUrlSchema }), c.uploadUrl);
materialsRoutes.post('/courses/:id/materials', requireRole('teacher', 'academic'), requireCourseAccess(), validate({ body: createMaterialSchema }), c.create);
// Материал бүрийн хандалтын тоо (багш, алба)
materialsRoutes.get('/courses/:id/materials/stats', requireRole('teacher', 'academic', 'management'), requireCourseAccess(), c.courseStats);

materialsRoutes.get('/materials/:id/download', c.download);
materialsRoutes.get('/materials/:id/view', c.view);
materialsRoutes.get('/materials/:id/access', requireRole('teacher', 'academic', 'management'), c.accessDetail);
materialsRoutes.patch('/materials/:id', requireRole('teacher', 'academic'), validate({ body: updateMaterialSchema }), c.update);
materialsRoutes.delete('/materials/:id', requireRole('teacher', 'academic'), c.remove);
