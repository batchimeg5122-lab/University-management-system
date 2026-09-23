import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './auth.controller';
import { avatarUploadSchema, lookupSchema, updateMeSchema } from './auth.schema';

export const authRoutes = Router();

authRoutes.post('/auth/lookup', validate({ body: lookupSchema }), c.lookup); // нээлттэй
authRoutes.get('/auth/me', requireAuth, c.me);
// Mobile/Web: хэрэглэгч өөрийн утас, профайл зургийг шинэчилнэ
authRoutes.patch('/auth/me', requireAuth, validate({ body: updateMeSchema }), c.updateMe);
authRoutes.post('/auth/me/avatar-upload-url', requireAuth, validate({ body: avatarUploadSchema }), c.avatarUploadUrl);
// Нэвтрэлтийн түүх
authRoutes.post('/auth/login-event', requireAuth, c.loginEvent);
authRoutes.get('/auth/login-history', requireAuth, c.myLoginHistory);
authRoutes.get('/admin/login-history', requireAuth, requireRole('super_admin'), c.allLoginHistory);
authRoutes.get('/auth/sessions', requireAuth, c.mySessions);
authRoutes.delete('/auth/sessions/:platform', requireAuth, c.revokeSession);
