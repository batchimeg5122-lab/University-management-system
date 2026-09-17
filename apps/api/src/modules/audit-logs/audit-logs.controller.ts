import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './audit-logs.service';

export const list = asyncHandler(async (req, res) => ok(res, await service.list(req.query as never)));
