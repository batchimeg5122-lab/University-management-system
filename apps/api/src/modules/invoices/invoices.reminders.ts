import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { APP_TIMEZONE, localDate } from '../../utils/local-date';
import { notifyMany } from '../notifications/notifications.service';
import { get as getSetting } from '../settings/settings.service';
import { INVOICE_SELECT, mapInvoice } from './invoices.service';
import type { debtorsQuery } from './invoices.schema';

const OPEN = ['pending', 'partial', 'overdue'];
const DAY = 86_400_000;
const money = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`;
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DAY);

/** Төлөгдөөгүй үлдэгдэлтэй нэхэмжлэлүүд */
export async function debtors(q: z.infer<typeof debtorsQuery>) {
  let query = supabase.from('invoices').select(`${INVOICE_SELECT}, last_reminded_at, reminder_count`).in('status', OPEN).order('due_date', { ascending: true, nullsFirst: false }).limit(10000);
  if (q.semester_id) query = query.eq('semester_id', q.semester_id);
  const today = localDate();
  const rows = (await run(query))
    .map((r: any) => {
      const inv = mapInvoice(r);
      const balance = Math.max(0, inv.net_amount - inv.paid_amount);
      const days_overdue = inv.due_date && inv.due_date < today ? daysBetween(inv.due_date, today) : 0;
      return { ...inv, balance, days_overdue, last_reminded_at: r.last_reminded_at ?? null, reminder_count: r.reminder_count ?? 0 };
    })
    .filter((r: any) => r.balance > 0);
  return q.overdue_only === 'true' ? rows.filter((r: any) => r.days_overdue > 0) : rows;
}

/** Сонгосон нэхэмжлэлийн оюутнуудад сануулга (мэдэгдэл + push) */
export async function remind(invoiceIds: string[], extra: string | null, actor: AuthUser | null) {
  const today = localDate();
  const rows: any[] = [];
  for (let i = 0; i < invoiceIds.length; i += 300) {
    rows.push(...(await run(supabase.from('invoices').select(`${INVOICE_SELECT}, reminder_count`).in('id', invoiceIds.slice(i, i + 300)).in('status', OPEN))));
  }
  const items = rows
    .map((r) => {
      const inv = mapInvoice(r);
      const balance = Math.max(0, inv.net_amount - inv.paid_amount);
      if (balance <= 0 || !r.students?.user_id) return null;
      const overdue = inv.due_date && inv.due_date < today;
      const due = inv.due_date ? (overdue ? `Төлөх хугацаа ${inv.due_date}-нд дууссан.` : `Төлөх хугацаа: ${inv.due_date}.`) : '';
      return {
        id: r.id as string,
        count: Number(r.reminder_count ?? 0),
        userId: r.students.user_id as string,
        title: overdue ? 'Төлбөрийн хугацаа хэтэрсэн' : 'Төлбөрийн сануулга',
        message: `${inv.semester_name ?? ''} сургалтын төлбөрийн үлдэгдэл ${money(balance)}. ${due}${extra ? ` ${extra}` : ''}`.trim(),
      };
    })
    .filter(Boolean) as { id: string; count: number; userId: string; title: string; message: string }[];

  await notifyMany(items, 'finance', actor?.id ?? null);

  const now = new Date().toISOString();
  for (let i = 0; i < items.length; i += 25) {
    await Promise.all(items.slice(i, i + 25).map((it) => supabase.from('invoices').update({ last_reminded_at: now, reminder_count: it.count + 1 }).eq('id', it.id)));
  }
  return { reminded: items.length };
}

const localHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, hour: 'numeric', hour12: false }).format(new Date()));

/**
 * Цагт нэг ажиллана (server.ts):
 * 1) Хугацаа хэтэрсэн "pending" нэхэмжлэлийг "overdue" болгоно
 * 2) Автомат сануулга (10:00–18:00 цагт): хугацаа дуусахаас ≤3 хоногийн өмнө (3 хоногт 1 удаа),
 *    хугацаа хэтэрсэн бол долоо хоногт 1 удаа. FINANCE_AUTO_REMIND=false бол унтарна.
 */
export async function runFinanceJobs() {
  const today = localDate();
  const { error: overdueErr } = await supabase.from('invoices').update({ status: 'overdue' }).eq('status', 'pending').lt('due_date', today);
  if (overdueErr) console.warn('[finance-job] overdue:', overdueErr.message);

  const cfg = await getSetting('finance');
  if (!cfg.auto_remind || process.env.FINANCE_AUTO_REMIND === 'false') return;
  const hour = localHour();
  if (hour < 10 || hour >= 18) return;

  const soon = new Date(Date.now() + cfg.remind_days_before * DAY).toISOString().slice(0, 10);
  const threeDaysAgo = new Date(Date.now() - cfg.remind_days_before * DAY).toISOString();
  const weekAgo = new Date(Date.now() - cfg.overdue_repeat_days * DAY).toISOString();

  const { data: dueSoon, error: e1 } = await supabase
    .from('invoices')
    .select('id')
    .in('status', ['pending', 'partial'])
    .gte('due_date', today)
    .lte('due_date', soon)
    .or(`last_reminded_at.is.null,last_reminded_at.lt."${threeDaysAgo}"`)
    .limit(2000);
  const { data: overdue, error: e2 } = await supabase
    .from('invoices')
    .select('id')
    .in('status', ['overdue', 'partial'])
    .lt('due_date', today)
    .or(`last_reminded_at.is.null,last_reminded_at.lt."${weekAgo}"`)
    .limit(2000);
  if (e1 || e2) return console.warn('[finance-job]', (e1 ?? e2)?.message);

  const ids = [...new Set([...(dueSoon ?? []), ...(overdue ?? [])].map((r: { id: string }) => r.id))];
  if (ids.length) {
    const { reminded } = await remind(ids, null, null);
    if (reminded) console.log(`[finance-job] автомат сануулга: ${reminded}`);
  }
}
