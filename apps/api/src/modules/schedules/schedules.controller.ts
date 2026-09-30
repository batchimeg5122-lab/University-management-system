import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './schedules.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never, req.user!)));

export const conflicts = asyncHandler(async (req, res) => ok(res, await service.conflicts(req.query.semester_id as string | undefined)));

export const suggestions = asyncHandler(async (req, res) => ok(res, await service.suggestions(req.query as never)));

export const create = asyncHandler(async (req, res) => {
  const result = await service.create(req.body);
  audit(req, result.schedules.length > 1 ? 'CREATE_MERGED_SCHEDULE' : 'CREATE_SCHEDULE', 'schedules', result.schedules[0]?.id ?? null, {
    courses: req.body.course_ids,
    day_of_week: req.body.day_of_week,
    session_type: req.body.session_type,
  });
  ok(res, result, 201);
});

export const update = asyncHandler(async (req, res) => {
  const result = await service.update(req.params.id, req.body);
  audit(req, 'UPDATE_SCHEDULE', 'schedules', req.params.id, req.body);
  ok(res, result);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id, req.query.group === 'true');
  audit(req, 'DELETE_SCHEDULE', 'schedules', req.params.id, { group: req.query.group === 'true' });
  ok(res, result);
});

/** Багш тухайн өдрийн хичээлээ цуцлах */
export const cancelClass = asyncHandler(async (req, res) => {
  const result = await service.cancelClass(req.params.id, req.body, req.user!);
  audit(req, 'CANCEL_CLASS', 'class_cancellations', req.params.id, { cancel_date: result.cancel_date, reason: result.reason });
  ok(res, result, 201);
});

/** Цуцлалтыг буцаах */
export const restoreClass = asyncHandler(async (req, res) => {
  const result = await service.restoreClass(req.params.id, req.query.date as string | undefined, req.user!);
  audit(req, 'RESTORE_CLASS', 'class_cancellations', req.params.id, { cancel_date: result.cancel_date });
  ok(res, result);
});

export const cancellations = asyncHandler(async (req, res) => ok(res, await service.cancellations(req.query as never, req.user!)));
