import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './enrollments.service';

export const listByCourse = asyncHandler(async (req, res) => ok(res, await service.listByCourse(req.params.id)));
export const add = asyncHandler(async (req, res) => {
  const result = await service.add(req.params.id, req.body.student_ids);
  audit(req, 'ADD_ENROLLMENT', 'enrollments', req.params.id, result);
  ok(res, result, 201);
});
