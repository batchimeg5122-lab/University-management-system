import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './users.controller';
import { createUserSchema, listUsersQuery, resetPasswordSchema, updateUserSchema } from './users.schema';

export const usersRoutes = Router();

usersRoutes.get('/users', requireRole('management', 'academic'), validate({ query: listUsersQuery }), c.list);
usersRoutes.post('/users', requireRole('super_admin'), validate({ body: createUserSchema }), c.create);

// Зөвхөн системийн админ
// "/users/confirm-emails" нь "/users/:id"-ээс өмнө байх ёстой
usersRoutes.post('/users/confirm-emails', requireRole('super_admin'), c.confirmAllEmails);
usersRoutes.get('/users/:id', requireRole('super_admin'), c.detail);
usersRoutes.post('/users/:id/confirm-email', requireRole('super_admin'), c.confirmEmail);
usersRoutes.patch('/users/:id', requireRole('super_admin'), validate({ body: updateUserSchema }), c.update);
usersRoutes.post('/users/:id/password', requireRole('super_admin'), validate({ body: resetPasswordSchema }), c.resetPassword);
