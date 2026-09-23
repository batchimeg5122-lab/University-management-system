import { get } from '@/lib/api';
import type { AuditLog } from '@/types/models';

export const auditApi = {
  list: (params: { action?: string; table?: string; source?: string }) => get<AuditLog[]>('/audit-logs', params),
};
