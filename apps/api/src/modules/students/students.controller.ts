import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './students.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));
export const detail = asyncHandler(async (req, res) => ok(res, await service.detail(req.params.id, req.user!)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body);
  audit(req, 'CREATE_STUDENT', 'students', row.id, { student_code: row.student_code });
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body);
  audit(req, req.body.status ? 'UPDATE_STUDENT_STATUS' : 'UPDATE_STUDENT', 'students', req.params.id, req.body);
  ok(res, row);
});
