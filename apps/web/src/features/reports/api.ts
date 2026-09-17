import { get } from '@/lib/api';
import type { CourseStats, DepartmentReport, OverviewReport, SchoolReport, StudentSummary } from '@/types/reports';

export const reportsApi = {
  overview: () => get<OverviewReport>('/reports/overview'),
  schools: () => get<SchoolReport[]>('/reports/schools'),
  departments: (school_id?: string) => get<DepartmentReport[]>('/reports/departments', { school_id }),
  course: (id: string) => get<CourseStats>(`/reports/courses/${id}`),
  studentSummary: () => get<StudentSummary>('/reports/student-summary'),
};
