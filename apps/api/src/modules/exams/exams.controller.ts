import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './exams.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never, req.user!)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'CREATE_EXAM', 'exams', row.id, { course_id: row.course_id, exam_date: row.exam_date });
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body, req.user!);
  audit(req, 'UPDATE_EXAM', 'exams', req.params.id, req.body);
  ok(res, row);
});
export const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id, req.user!);
  audit(req, 'DELETE_EXAM', 'exams', req.params.id);
  ok(res, result);
});
