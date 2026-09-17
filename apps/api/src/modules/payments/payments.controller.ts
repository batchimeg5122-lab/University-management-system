import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './payments.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'RECORD_PAYMENT', 'payments', row.id, { invoice_id: req.body.invoice_id, amount: req.body.amount, method: req.body.method });
  ok(res, row, 201);
});
export const mine = asyncHandler(async (req, res) => ok(res, await service.mine(req.user!)));
