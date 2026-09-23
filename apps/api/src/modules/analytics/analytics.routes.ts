import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import * as c from './analytics.controller';

export const analyticsRoutes = Router();

analyticsRoutes.get('/analytics/at-risk', requireRole('academic', 'management'), c.risk);
analyticsRoutes.post('/analytics/at-risk/notify', requireRole('academic', 'management'), c.notify);
analyticsRoutes.get('/analytics/trends', requireRole('academic', 'management', 'finance'), c.trend);
analyticsRoutes.get('/analytics/weekly', requireRole('management'), c.weekly);
analyticsRoutes.post('/analytics/weekly/send', requireRole('management'), c.weeklySend);
