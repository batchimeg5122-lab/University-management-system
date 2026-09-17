import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './attendance.service';

export const byCourse = asyncHandler(async (req, res) => ok(res, await service.byCourse(req.params.id, req.query.date as string | undefined)));
export const dates = asyncHandler(async (req, res) => ok(res, await service.dates(req.params.id)));
export const save = asyncHandler(async (req, res) => {
  const result = await service.save(req.params.id, req.body);
  audit(req, 'UPDATE_ATTENDANCE', 'attendance', req.params.id, { date: req.body.date, ...result });
  ok(res, result);
});
export const mine = asyncHandler(async (req, res) => ok(res, await service.mine(req.user!)));
