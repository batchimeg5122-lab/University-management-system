import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { syncInvoice } from '../invoices/invoices.service';
import { notifyUsers } from '../notifications/notifications.service';
import type { createPaymentSchema, listPaymentsQuery } from './payments.schema';

const SELECT = '*, invoices(invoice_number), students(student_code, users(full_name))';

const mapPayment = ({ invoices, students, ...r }: any) => ({
  ...r,
  amount: Number(r.amount),
  invoice_number: invoices?.invoice_number,
  student_code: students?.student_code,
  student_name: students?.users?.full_name,
});

export async function list(q: z.infer<typeof listPaymentsQuery>) {
  let query = supabase.from('payments').select(SELECT).order('payment_date', { ascending: false }).limit(5000);
  if (q.method) query = query.eq('method', q.method);
  let rows = (await run(query)).map(mapPayment);
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter((p) => [p.student_name, p.student_code, p.invoice_number].some((v) => String(v ?? '').toLowerCase().includes(needle)));
  }
  return rows;
}

export async function create(input: z.infer<typeof createPaymentSchema>, actor: AuthUser) {
  const inv = await run(supabase.from('invoices').select('id, student_id, status, students(user_id)').eq('id', input.invoice_id).single());
  if (inv.status === 'cancelled') throw unprocessable('Цуцалсан нэхэмжлэлд төлөлт бүртгэх боломжгүй.');

  const row = await run(
    supabase
      .from('payments')
      .insert({
        invoice_id: inv.id,
        student_id: inv.student_id,
        amount: input.amount,
        method: input.method,
        transaction_reference: input.transaction_reference ?? null,
        description: input.description ?? null,
        payment_date: input.payment_date ? new Date(input.payment_date).toISOString() : new Date().toISOString(),
      })
      .select(SELECT)
      .single(),
  );

  await syncInvoice(inv.id);

  const userId = (inv as any).students?.user_id;
  if (userId) {
    await notifyUsers([userId], 'Төлбөр хүлээн авлаа', `${input.amount.toLocaleString('en-US')}₮ төлбөр амжилттай бүртгэгдлээ.`, 'finance', actor.id);
  }
  return mapPayment(row);
}

export async function mine(actor: AuthUser) {
  const rows = await run(supabase.from('payments').select(SELECT).eq('student_id', actor.studentId ?? '').order('payment_date', { ascending: false }));
  return rows.map(mapPayment);
}
