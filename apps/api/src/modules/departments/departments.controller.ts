import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './departments.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body);
  audit(req, 'CREATE_DEPARTMENT', 'departments', row.id, req.body);
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body);
  audit(req, 'UPDATE_DEPARTMENT', 'departments', row.id, req.body);
  ok(res, row);
});
