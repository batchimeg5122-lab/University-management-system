import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './grades.service';

export const items = asyncHandler(async (req, res) => ok(res, await service.items(req.params.id)));
export const save = asyncHandler(async (req, res) => {
  const result = await service.save(req.params.id, req.body);
  audit(req, 'UPDATE_GRADE', 'enrollments', req.params.id, result);
  ok(res, result);
});
export const submit = asyncHandler(async (req, res) => {
  const result = await service.submit(req.params.id);
  audit(req, 'SUBMIT_GRADE', 'enrollments', req.params.id, result);
  ok(res, result);
});
export const pending = asyncHandler(async (_req, res) => ok(res, await service.pending()));
export const approve = asyncHandler(async (req, res) => {
  const result = await service.approve(req.body.course_id, req.user!);
  audit(req, 'APPROVE_GRADE', 'enrollments', req.body.course_id, result);
  ok(res, result);
});
export const reject = asyncHandler(async (req, res) => {
  const result = await service.reject(req.body.course_id, req.body.reason, req.user!);
  audit(req, 'REJECT_GRADE', 'enrollments', req.body.course_id, { reason: req.body.reason });
  ok(res, result);
});
export const mine = asyncHandler(async (req, res) => ok(res, await service.mine(req.user!)));
