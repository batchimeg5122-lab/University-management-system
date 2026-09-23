import { Router } from 'express';
import { audit } from '../../middleware/audit.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './settings.service';

export const settingsRoutes = Router();

settingsRoutes.get('/settings/public', asyncHandler(async (_req, res) => ok(res, await service.publicSettings())));
settingsRoutes.get('/settings', requireRole('super_admin'), asyncHandler(async (_req, res) => ok(res, await service.all())));
settingsRoutes.put(
  '/settings/:key',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const value = await service.set(req.params.key, req.body, req.user!);
    audit(req, 'UPDATE_SETTINGS', 'system_settings', null, { key: req.params.key, value });
    ok(res, value);
  }),
);
