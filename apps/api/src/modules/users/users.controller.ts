import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './users.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));

export const detail = asyncHandler(async (req, res) => ok(res, await service.detail(req.params.id)));

export const create = asyncHandler(async (req, res) => {
  const user = await service.create(req.body);
  audit(req, 'CREATE_USER', 'users', user.id, { email: user.email, role: user.role });
  ok(res, user, 201);
});

export const update = asyncHandler(async (req, res) => {
  const result = await service.update(req.params.id, req.body, req.user!);
  const roleChanged = result.changed.includes('role');
  audit(req, roleChanged ? 'UPDATE_ROLE' : 'UPDATE_USER', 'users', req.params.id, { changed: result.changed, role: req.body.role, status: req.body.status });
  ok(res, result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await service.resetPassword(req.params.id, req.body);
  // Нууц үгийг audit log-д ХЭЗЭЭ Ч бичихгүй
  audit(req, 'RESET_PASSWORD', 'users', req.params.id, { generated: !req.body.password, must_change: result.must_change_password });
  ok(res, result);
});

export const confirmEmail = asyncHandler(async (req, res) => {
  const result = await service.confirmEmail(req.params.id);
  if (!result.already_confirmed) audit(req, 'CONFIRM_EMAIL', 'users', req.params.id);
  ok(res, result);
});

export const confirmAllEmails = asyncHandler(async (req, res) => {
  const result = await service.confirmAllEmails();
  audit(req, 'CONFIRM_EMAIL', 'users', null, { bulk: true, confirmed: result.confirmed });
  ok(res, result);
});
