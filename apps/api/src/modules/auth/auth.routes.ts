import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './auth.controller';
import { lookupSchema } from './auth.schema';

export const authRoutes = Router();

authRoutes.post('/auth/lookup', validate({ body: lookupSchema }), c.lookup); // нээлттэй
authRoutes.get('/auth/me', requireAuth, c.me);
