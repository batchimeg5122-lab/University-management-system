import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as bulk from './invoices.bulk';
import * as reminders from './invoices.reminders';
import * as service from './invoices.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body);
  audit(req, 'CREATE_INVOICE', 'invoices', row.id, req.body);
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body);
  audit(req, 'UPDATE_INVOICE', 'invoices', req.params.id, req.body);
  ok(res, row);
});
export const mine = asyncHandler(async (req, res) => ok(res, await service.mine(req.user!)));

// --- Бөөнөөр нэхэмжлэх, өр төлбөр

export const bulkPreview = asyncHandler(async (req, res) => ok(res, await bulk.preview(req.body)));
export const bulkCreate = asyncHandler(async (req, res) => {
  const result = await bulk.create(req.body, req.user!);
  audit(req, 'BULK_CREATE_INVOICES', 'invoices', null, { ...result, scope: req.body.scope, mode: req.body.mode, amount: req.body.amount });
  ok(res, result, 201);
});
export const debtors = asyncHandler(async (req, res) => ok(res, await reminders.debtors(req.query as never)));
export const remind = asyncHandler(async (req, res) => {
  const result = await reminders.remind(req.body.invoice_ids, req.body.message ?? null, req.user!);
  audit(req, 'SEND_PAYMENT_REMINDER', 'invoices', null, { count: result.reminded });
  ok(res, result);
});
