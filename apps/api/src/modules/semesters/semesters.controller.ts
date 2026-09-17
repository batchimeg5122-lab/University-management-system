import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './semesters.service';

export const list = asyncHandler(async (_req, res) => ok(res, await service.list()));
export const current = asyncHandler(async (_req, res) => ok(res, await service.current()));
export const create = asyncHandler(async (req, res) => ok(res, await service.create(req.body), 201));
export const setCurrent = asyncHandler(async (req, res) => {
  const row = await service.setCurrent(req.params.id);
  audit(req, 'SET_CURRENT_SEMESTER', 'semesters', req.params.id);
  ok(res, row);
});
