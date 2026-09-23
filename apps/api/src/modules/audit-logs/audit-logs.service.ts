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
  // Хуучин бичлэгт source байхгүй — тэдгээрийг WEB гэж үзнэ
  if (q.source === 'MOBILE') query = query.eq('new_data->>source', 'MOBILE');
  if (q.source === 'WEB') query = query.or('new_data->>source.eq.WEB,new_data->>source.is.null');
  const rows = await run(query);
  return rows.map(({ users, ...r }: any) => ({ ...r, user_name: users?.full_name ?? null, source: r.new_data?.source === 'MOBILE' ? 'MOBILE' : 'WEB' }));
}
