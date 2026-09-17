import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './auth.service';

export const me = asyncHandler(async (req, res) => ok(res, await service.getSession(req.user!)));
export const lookup = asyncHandler(async (req, res) => ok(res, await service.lookupEmail(req.body.identifier)));
