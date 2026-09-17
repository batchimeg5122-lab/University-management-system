import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as service from './reports.service';

export const overview = asyncHandler(async (_req, res) => ok(res, await service.overview()));
export const schools = asyncHandler(async (_req, res) => ok(res, await service.schools()));
export const departments = asyncHandler(async (req, res) => ok(res, await service.departments(req.query.school_id as string | undefined)));
export const course = asyncHandler(async (req, res) => ok(res, await service.course(req.params.id)));
export const finance = asyncHandler(async (req, res) => ok(res, await service.finance(req.query.semester_id as string | undefined)));
export const studentSummary = asyncHandler(async (req, res) => ok(res, await service.studentSummary(req.user!)));
