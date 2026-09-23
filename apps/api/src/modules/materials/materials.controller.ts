import { audit } from '../../middleware/audit.middleware';
import { ok } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { notifyCourseStudents } from '../notifications/notifications.service';
import * as service from './materials.service';

export const listByCourse = asyncHandler(async (req, res) => ok(res, await service.listByCourse(req.params.id, req.user!)));

export const listForStudent = asyncHandler(async (req, res) => ok(res, await service.listForStudent(req.user!)));

export const uploadUrl = asyncHandler(async (req, res) => ok(res, await service.createUploadUrl(req.params.id, req.body), 201));

export const create = asyncHandler(async (req, res) => {
  const row = await service.create(req.params.id, req.body, req.user!);
  audit(req, 'ADD_MATERIAL', 'course_materials', row.id, { course_id: req.params.id, title: row.title });
  if (row.is_published) {
    void notifyCourseStudents([req.params.id], 'Шинэ материал', `${row.subject_name ?? 'Хичээл'}: ${row.title}`, 'general', req.user!.id);
  }
  ok(res, row, 201);
});

export const download = asyncHandler(async (req, res) => ok(res, await service.downloadUrl(req.params.id, req.user!)));

export const view = asyncHandler(async (req, res) => ok(res, await service.viewUrl(req.params.id, req.user!)));

export const update = asyncHandler(async (req, res) => {
  const row = await service.update(req.params.id, req.body, req.user!);
  audit(req, 'UPDATE_MATERIAL', 'course_materials', req.params.id, req.body);
  ok(res, row);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id, req.user!);
  audit(req, 'DELETE_MATERIAL', 'course_materials', req.params.id);
  ok(res, result);
});

export const courseStats = asyncHandler(async (req, res) => ok(res, await service.courseStats(req.params.id)));

export const accessDetail = asyncHandler(async (req, res) => ok(res, await service.accessDetail(req.params.id, req.user!)));
