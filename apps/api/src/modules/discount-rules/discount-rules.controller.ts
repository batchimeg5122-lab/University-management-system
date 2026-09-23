import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './discount-rules.service';

export const list = asyncHandler(async (_req, res) => ok(res, await service.list()));
export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.body, req.user!);
  audit(req, 'CREATE_DISCOUNT_RULE', 'discount_rules', row.id, { name: row.name, kind: row.kind, percent: row.percent, amount: row.amount });
  ok(res, row, 201);
});
export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body);
  audit(req, 'UPDATE_DISCOUNT_RULE', 'discount_rules', req.params.id, req.body);
  ok(res, row);
});
export const remove = asyncHandler(async (req, res) => {
  const r = await service.remove(req.params.id);
  audit(req, 'DELETE_DISCOUNT_RULE', 'discount_rules', req.params.id);
  ok(res, r);
});
