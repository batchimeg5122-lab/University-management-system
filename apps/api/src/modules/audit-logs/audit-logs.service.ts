import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { run } from '../../utils/api-response';
import { pageRange } from '../../utils/pagination';
import type { listAuditLogsQuery } from './audit-logs.schema';

export async function list(q: z.infer<typeof listAuditLogsQuery>) {
  const { from, to } = pageRange(q, 500, 2000);
  let query = supabase.from('audit_logs').select('*, users(full_name)').order('created_at', { ascending: false }).range(from, to);
  if (q.action) query = query.eq('action', q.action);
  if (q.table) query = query.eq('table_name', q.table);
  if (q.user_id) query = query.eq('user_id', q.user_id);
  const rows = await run(query);
  return rows.map(({ users, ...r }: any) => ({ ...r, user_name: users?.full_name ?? null }));
}
