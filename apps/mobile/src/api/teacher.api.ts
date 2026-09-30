import { get } from './client';
import type { TeacherDashboard, WorkloadReport } from '../types/models';

export const teacherApi = {
  dashboard: () => get<TeacherDashboard>('/teacher/dashboard'),
  /** Хичээлийн цагийн тайлан — багш зөвхөн өөрийнхөө */
  workload: (params: { semester_id?: string } = {}) => get<WorkloadReport>('/teacher/workload', params),
};
