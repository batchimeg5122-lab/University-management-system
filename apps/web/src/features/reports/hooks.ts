import { useQuery } from '@tanstack/react-query';
import { reportsApi } from './api';

export const useOverview = () => useQuery({ queryKey: ['reports', 'overview'], queryFn: reportsApi.overview });
export const useSchoolReports = () => useQuery({ queryKey: ['reports', 'schools'], queryFn: reportsApi.schools });
export const useDepartmentReports = (schoolId?: string) =>
  useQuery({ queryKey: ['reports', 'departments', schoolId], queryFn: () => reportsApi.departments(schoolId) });
export const useCourseStats = (id: string | undefined) =>
  useQuery({ queryKey: ['reports', 'course', id], queryFn: () => reportsApi.course(id!), enabled: !!id });
export const useStudentSummary = () => useQuery({ queryKey: ['reports', 'student-summary'], queryFn: reportsApi.studentSummary });
