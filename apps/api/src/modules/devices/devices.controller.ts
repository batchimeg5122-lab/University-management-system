import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './devices.service';

export const register = asyncHandler(async (req, res) => ok(res, await service.register(req.body, req.user!), 201));
export const unregister = asyncHandler(async (req, res) => ok(res, await service.unregister(req.body, req.user!)));
export const stats = asyncHandler(async (_req, res) => ok(res, await service.stats()));
