import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './certificates.service';

export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.user!, req.body);
  audit(req, 'ISSUE_CERTIFICATE', 'student_certificates', row.id, { number: row.number, purpose: req.body.purpose });
  ok(res, row, 201);
});

export const mine = asyncHandler(async (req, res) => ok(res, await service.mine(req.user!)));
export const detail = asyncHandler(async (req, res) => ok(res, await service.detail(req.params.id, req.user!)));
export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));

export const revoke = asyncHandler(async (req, res) => {
  const row = await service.revoke(req.params.id, req.user!);
  audit(req, 'REVOKE_CERTIFICATE', 'student_certificates', req.params.id, { number: row.number });
  ok(res, row);
});

/** Нээлттэй (нэвтрэхгүй) */
export const verify = asyncHandler(async (req, res) => ok(res, await service.verify(req.params.code)));
