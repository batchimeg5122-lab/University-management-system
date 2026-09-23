import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as reconcile from './payments.reconcile';
import * as service from './payments.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'RECORD_PAYMENT', 'payments', row.id, { invoice_id: req.body.invoice_id, amount: req.body.amount, method: req.body.method });
  ok(res, row, 201);
});
export const mine = asyncHandler(async (req, res) => ok(res, await service.mine(req.user!)));

export const reconcilePreview = asyncHandler(async (req, res) => ok(res, await reconcile.preview(req.body)));
export const bulkCreate = asyncHandler(async (req, res) => {
  const result = await reconcile.createBulk(req.body, req.user!);
  audit(req, 'IMPORT_BANK_STATEMENT', 'payments', null, { created: result.created, duplicates: result.duplicates, errors: result.errors.length });
  ok(res, result, 201);
});
