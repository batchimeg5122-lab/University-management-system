import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { toHttpError } from '../../utils/api-response';
import { unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { required, run } from '../../utils/api-response';
import { currentId } from '../semesters/semesters.service';
import type { createInvoiceSchema, listInvoicesQuery, updateInvoiceSchema } from './invoices.schema';

export const INVOICE_SELECT = '*, students(student_code, user_id, program_id, users(full_name)), semesters(academic_year,name)';

export const mapInvoice = ({ students, semesters, ...r }: any) => ({
  ...r,
  tuition_amount: Number(r.tuition_amount),
  discount_amount: Number(r.discount_amount),
  net_amount: Number(r.net_amount),
  paid_amount: Number(r.paid_amount),
  student_code: students?.student_code,
  student_name: students?.users?.full_name,
  semester_name: semesters ? `${semesters.academic_year} ${semesters.name}` : undefined,
});

const today = () => new Date().toISOString().slice(0, 10);

/** Төлсөн дүн, төлөвийг төлөлтүүдээс дахин тооцно (DB trigger байхгүй тохиолдолд ч зөв) */
export async function syncInvoice(invoiceId: string) {
  const inv = await run(supabase.from('invoices').select('tuition_amount, discount_amount, status, due_date').eq('id', invoiceId).single());
  const payments = await run(supabase.from('payments').select('amount').eq('invoice_id', invoiceId));
  const net = Number(inv.tuition_amount) - Number(inv.discount_amount);
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);

  let status = inv.status;
  if (status !== 'cancelled') {
    if (paid >= net && net > 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    else status = inv.due_date && inv.due_date < today() ? 'overdue' : 'pending';
  }
  const { error } = await supabase.from('invoices').update({ paid_amount: paid, status }).eq('id', invoiceId);
  if (error) throw toHttpError(error);
}

export async function list(q: z.infer<typeof listInvoicesQuery>) {
  let query = supabase.from('invoices').select(INVOICE_SELECT).order('created_at', { ascending: false }).limit(5000);
  if (q.status) query = query.eq('status', q.status);
  if (q.semester_id) query = query.eq('semester_id', q.semester_id);
  let rows = (await run(query)).map(mapInvoice);
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter((i) => [i.student_name, i.student_code, i.invoice_number].some((v) => String(v ?? '').toLowerCase().includes(needle)));
  }
  return rows;
}

export async function create(input: z.infer<typeof createInvoiceSchema>) {
  const semester_id = input.semester_id ?? (await currentId());
  const count = await supabase.from('invoices').select('id', { count: 'exact', head: true });
  const invoice_number = `INV-${new Date().getFullYear()}-${String((count.count ?? 0) + 1).padStart(5, '0')}`;

  const row: Record<string, unknown> = {
    ...input,
    semester_id,
    invoice_number,
    net_amount: input.tuition_amount - input.discount_amount,
    paid_amount: 0,
    status: 'pending',
  };

  let { data, error } = await supabase.from('invoices').insert(row).select('id').single();
  // net_amount нь generated column бол түүнийг хасаж дахин оролдоно
  if (error?.code === '428C9') {
    delete row.net_amount;
    ({ data, error } = await supabase.from('invoices').insert(row).select('id').single());
  }
  if (error || !data) throw toHttpError(error!);

  await syncInvoice(data.id);
  return mapInvoice(await run(supabase.from('invoices').select(INVOICE_SELECT).eq('id', data.id).single()));
}

export async function update(id: string, input: z.infer<typeof updateInvoiceSchema>) {
  const inv = required(await run(supabase.from('invoices').select('tuition_amount').eq('id', id)), 'Нэхэмжлэл олдсонгүй.')[0];
  if (input.discount_amount !== undefined && input.discount_amount > Number(inv.tuition_amount)) {
    throw unprocessable('Хөнгөлөлт төлбөрийн дүнгээс их байж болохгүй.');
  }
  const patch: Record<string, unknown> = { ...input };
  if (input.discount_amount !== undefined) patch.net_amount = Number(inv.tuition_amount) - input.discount_amount;

  let { error } = await supabase.from('invoices').update(patch).eq('id', id);
  if (error?.code === '428C9') {
    delete patch.net_amount;
    ({ error } = await supabase.from('invoices').update(patch).eq('id', id));
  }
  if (error) throw toHttpError(error);

  await syncInvoice(id);
  return mapInvoice(await run(supabase.from('invoices').select(INVOICE_SELECT).eq('id', id).single()));
}

export async function mine(actor: AuthUser) {
  const rows = await run(supabase.from('invoices').select(INVOICE_SELECT).eq('student_id', actor.studentId ?? '').order('created_at', { ascending: false }));
  return rows.map(mapInvoice);
}
