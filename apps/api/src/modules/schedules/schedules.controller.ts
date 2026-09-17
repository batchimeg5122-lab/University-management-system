import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './schedules.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never, req.user!)));

export const conflicts = asyncHandler(async (req, res) => ok(res, await service.conflicts(req.query.semester_id as string | undefined)));

export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body);
  audit(req, 'CREATE_SCHEDULE', 'schedules', row.id, req.body);
  ok(res, row, 201);
});

export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body);
  audit(req, 'UPDATE_SCHEDULE', 'schedules', req.params.id, req.body);
  ok(res, row);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  audit(req, 'DELETE_SCHEDULE', 'schedules', req.params.id);
  ok(res, result);
});
