import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './teacher.service';
import * as load from './teacher.workload';

export const dashboard = asyncHandler(async (req, res) => ok(res, await service.dashboard(req.user!)));

/** Хичээлийн цагийн тайлан — багш өөрийнхөө, алба/удирдлага сонгосон багшийн */
export const workload = asyncHandler(async (req, res) => ok(res, await load.workload(req.query as never, req.user!)));

/** Бүх багшийн ачааллын хураангуй (алба, удирдлага) */
export const workloadByTeacher = asyncHandler(async (req, res) => ok(res, await load.workloadByTeacher(req.query as never, req.user!)));
