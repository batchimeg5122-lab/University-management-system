import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './courses.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never, req.user!)));
export const detail = asyncHandler(async (req, res) => ok(res, await service.detail(req.params.id)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'CREATE_COURSE', 'courses', row.id, req.body);
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body, req.user!);
  audit(req, req.body.teacher_id !== undefined ? 'ASSIGN_TEACHER' : 'UPDATE_COURSE', 'courses', req.params.id, req.body);
  ok(res, row);
});
