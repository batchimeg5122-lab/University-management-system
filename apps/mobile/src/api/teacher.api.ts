import { get } from './client';
import type { TeacherDashboard } from '../types/models';

export const teacherApi = {
  dashboard: () => get<TeacherDashboard>('/teacher/dashboard'),
};
