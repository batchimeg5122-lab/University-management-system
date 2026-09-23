import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './student-card.service';

export const mine = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await service.mine(req.user!));
});

export const verify = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await service.verify(String(req.params.token ?? '')));
});

export const check = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, await service.check(String(req.body?.token ?? ''), req.body?.location ? String(req.body.location).slice(0, 100) : null, req.user!));
});

export const checks = asyncHandler(async (req, res) => ok(res, await service.checks(Number(req.query.limit) || 100)));
