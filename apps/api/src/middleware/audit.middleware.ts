import type { Request } from 'express';
import { supabase } from '../config/supabase';

/**
 * audit_logs хүснэгтэд бичнэ. Алдаа гарсан ч үндсэн үйлдлийг зогсоохгүй.
 */
export function audit(req: Request, action: string, tableName: string, recordId: string | null = null, newData: unknown = null, oldData: unknown = null) {
  // Mobile app `X-Client-Platform: mobile` header илгээнэ → audit-д эх сурвалжийг хадгална
  const source = String(req.headers['x-client-platform'] ?? 'web').toUpperCase().slice(0, 20);
  const payload = newData && typeof newData === 'object' && !Array.isArray(newData) ? { ...(newData as Record<string, unknown>), source } : { value: newData, source };
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? null;
  void supabase
    .from('audit_logs')
    .insert({
      user_id: req.user?.id ?? null,
      action,
      table_name: tableName,
      record_id: recordId,
      new_data: payload,
      old_data: oldData,
      ip_address: ip,
    })
    .then(({ error }) => {
      if (error) console.warn('[audit]', error.message);
    });
}
