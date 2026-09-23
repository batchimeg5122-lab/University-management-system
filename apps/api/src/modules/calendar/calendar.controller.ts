import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './calendar.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never, req.user!)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'CREATE_CALENDAR_EVENT', 'academic_events', row.id, { title: row.title, start: row.start_date });
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body);
  audit(req, 'UPDATE_CALENDAR_EVENT', 'academic_events', req.params.id, req.body);
  ok(res, row);
});
export const remove = asyncHandler(async (req, res) => {
  const r = await service.remove(req.params.id);
  audit(req, 'DELETE_CALENDAR_EVENT', 'academic_events', req.params.id);
  ok(res, r);
});
