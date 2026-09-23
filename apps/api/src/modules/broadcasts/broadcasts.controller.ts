import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './broadcasts.service';

export const list = asyncHandler(async (_req, res) => ok(res, await service.list()));
export const preview = asyncHandler(async (req, res) => ok(res, await service.preview(req.body.audience)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'SEND_BROADCAST', 'broadcasts', row.id, { title: row.title, recipients: row.recipient_count, audience: row.audience_label });
  ok(res, row, 201);
});
export const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  audit(req, 'DELETE_BROADCAST', 'broadcasts', req.params.id);
  ok(res, result);
});
