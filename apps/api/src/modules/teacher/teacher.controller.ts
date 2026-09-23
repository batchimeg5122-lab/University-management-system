import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './teacher.service';

export const dashboard = asyncHandler(async (req, res) => ok(res, await service.dashboard(req.user!)));
