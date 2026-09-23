import { useQuery } from '@tanstack/react-query';
import { auditApi } from './api';

export const useAuditLogs = (params: { action?: string; table?: string; source?: string } = {}) =>
  useQuery({ queryKey: ['audit-logs', params], queryFn: () => auditApi.list(params) });
