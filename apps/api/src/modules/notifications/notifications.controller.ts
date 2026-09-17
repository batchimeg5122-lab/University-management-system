import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './notifications.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never, req.user!)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'PUBLISH_ANNOUNCEMENT', 'notifications', row.id, { title: row.title, target_role: row.target_role });
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => ok(res, await service.update(req.params.id, req.body, req.user!)));
export const readAll = asyncHandler(async (req, res) => ok(res, await service.readAll(req.user!)));
export const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  audit(req, 'DELETE_ANNOUNCEMENT', 'notifications', req.params.id);
  ok(res, result);
});
