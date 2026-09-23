import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './certificates.controller';
import { createCertificateSchema, listCertificatesQuery } from './certificates.schema';

/** Нээлттэй: код шалгах (нэвтрэх шаардлагагүй) */
export const publicCertificateRoutes = Router();
publicCertificateRoutes.get('/certificates/verify/:code', c.verify);

export const certificatesRoutes = Router();
certificatesRoutes.get('/certificates/me', requireAuth, requireRole('student'), c.mine);
certificatesRoutes.post('/certificates', requireAuth, requireRole('student'), validate({ body: createCertificateSchema }), c.create);
certificatesRoutes.get('/certificates', requireAuth, requireRole('academic', 'management'), validate({ query: listCertificatesQuery }), c.list);
certificatesRoutes.get('/certificates/:id', requireAuth, c.detail);
certificatesRoutes.post('/certificates/:id/revoke', requireAuth, requireRole('academic'), c.revoke);
