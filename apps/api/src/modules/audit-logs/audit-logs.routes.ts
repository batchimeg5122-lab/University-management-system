import { Router } from 'express';
import { requireRole } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as c from './audit-logs.controller';
import { listAuditLogsQuery } from './audit-logs.schema';

export const auditLogsRoutes = Router();

auditLogsRoutes.get('/audit-logs', requireRole('super_admin'), validate({ query: listAuditLogsQuery }), c.list);
