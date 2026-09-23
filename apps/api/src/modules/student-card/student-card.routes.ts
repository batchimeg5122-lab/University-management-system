import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import * as c from './student-card.controller';

/** Нээлттэй: QR-аар үнэмлэх шалгах (нэвтрэх шаардлагагүй) */
export const publicStudentCardRoutes = Router();
publicStudentCardRoutes.get('/student-card/verify/:token', c.verify);

export const studentCardRoutes = Router();
studentCardRoutes.get('/student-card/me', requireAuth, requireRole('student'), c.mine);

// Шалгах самбар (номын сан, хамгаалалт) — ажилтнууд
const STAFF_AND_TEACHER = ['management', 'academic', 'finance', 'teacher'] as const;
studentCardRoutes.post('/student-card/check', requireAuth, requireRole(...STAFF_AND_TEACHER), c.check);
studentCardRoutes.get('/student-card/checks', requireAuth, requireRole(...STAFF_AND_TEACHER), c.checks);
