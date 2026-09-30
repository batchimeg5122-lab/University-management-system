import { useQuery } from '@tanstack/react-query';
import { workloadApi, type WorkloadParams } from './api';

/** Хичээлийн цагийн тайлан (багш — өөрийн, алба — сонгосон багшийн) */
export const useWorkload = (params: WorkloadParams = {}, enabled = true) =>
  useQuery({ queryKey: ['workload', params], queryFn: () => workloadApi.report(params), enabled, placeholderData: (p) => p });

/** Бүх багшийн ачааллын хураангуй */
export const useTeacherLoads = (params: WorkloadParams = {}, enabled = true) =>
  useQuery({ queryKey: ['workload', 'all', params], queryFn: () => workloadApi.byTeacher(params), enabled, placeholderData: (p) => p });
