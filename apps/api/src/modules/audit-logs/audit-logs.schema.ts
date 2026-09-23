import { z } from 'zod';

export const listAuditLogsQuery = z.object({
  action: z.string().optional(),
  table: z.string().optional(),
  user_id: z.string().uuid().optional().or(z.literal('')),
  /** WEB / MOBILE — audit.middleware new_data.source-оос */
  source: z.enum(['WEB', 'MOBILE']).optional().or(z.literal('')),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
});
