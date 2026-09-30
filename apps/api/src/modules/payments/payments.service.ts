import type { z } from 'zod';
import { supabase } from '../../config/supabase';
import { forbidden, notFound, unprocessable } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run, toHttpError } from '../../utils/api-response';
import { syncInvoice } from '../invoices/invoices.service';
import { notifyUsers } from '../notifications/notifications.service';
import { get as getSetting } from '../settings/settings.service';
import { amountInWords } from '../../utils/amount-words';
import type { createPaymentSchema, listPaymentsQuery } from './payments.schema';

const SELECT = '*, invoices(invoice_number), students(student_code, users(full_name))';

const mapPayment = ({ invoices, students, ...r }: any) => ({
  ...r,
  amount: Number(r.amount),
  invoice_number: invoices?.invoice_number,
  student_code: students?.student_code,
  student_name: students?.users?.full_name,
});

/**
 * Баримтын дараагийн дугаар — RCP-YYYY-00001.
 * Тухайн ОНЫ хамгийн их дугаараас бодно (мөрийн тоогоор бодвол устгалт болсон
 * тохиолдолд давхардана).
 */
export async function nextReceiptNo(date = new Date()): Promise<string | null> {
  const year = date.getFullYear();
  const { data, error } = await supabase
    .from('payments')
    .select('receipt_no')
    .like('receipt_no', `RCP-${year}-%`)
    .order('receipt_no', { ascending: false })
    .limit(1);
  // receipt_no багана байхгүй (migration ажиллаагүй) — дугаар олгохгүй, төлөлт хэвийн бүртгэгдэнэ
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204') return null;
    return null;
  }
  const last = Number(String(data?.[0]?.receipt_no ?? '').split('-')[2] ?? 0);
  return `RCP-${year}-${String(last + 1).padStart(5, '0')}`;
}

/** receipt_no багана байхгүй бол түүнийг хасаж дахин оролдоно */
async function insertPayments(rows: Record<string, unknown>[], select: string, single: boolean) {
  const attempt = (data: Record<string, unknown>[]) => {
    const q = supabase.from('payments').insert(data).select(select);
    return single ? q.single() : q;
  };
  let result = await attempt(rows);
  if (result.error && (result.error.code === 'PGRST204' || result.error.code === '42703')) {
    result = await attempt(rows.map(({ receipt_no: _r, ...rest }) => rest));
  }
  return result;
}

/** Нэг төлөлт нэмнэ (баримтын дугаартай). Багана байхгүй бол дугааргүйгээр дахин оролдоно. */
export async function insertWithReceipt(row: Record<string, unknown>) {
  const { error } = await insertPayments([row], 'id', false);
  return { error };
}

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

  const paidAt = input.payment_date ? new Date(input.payment_date) : new Date();
  const { data, error } = await insertPayments(
    [
      {
        invoice_id: inv.id,
        student_id: inv.student_id,
        amount: input.amount,
        method: input.method,
        transaction_reference: input.transaction_reference ?? null,
        description: input.description ?? null,
        payment_date: paidAt.toISOString(),
        receipt_no: await nextReceiptNo(paidAt),
      },
    ],
    SELECT,
    true,
  );
  if (error || !data) throw unprocessable(`Төлөлт бүртгэхэд алдаа гарлаа: ${error?.message ?? 'тодорхойгүй'}`);
  const row = data as unknown as Record<string, unknown>;

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

// =====================================================================
// ТӨЛБӨР ТӨЛСӨН БАРИМТ (receipt) — оюутан өөрийнх, санхүү/удирдлага бүгдийг
// =====================================================================

const RECEIPT_SELECT = `
  id, amount, method, payment_date, transaction_reference, description, receipt_no, created_at,
  invoices(invoice_number, tuition_amount, discount_amount, net_amount, paid_amount, status, due_date, semesters(name, academic_year)),
  students(student_code, users(full_name, email, phone), classes(code, programs(name)))
`;

/**
 * Баримт хэвлэхэд шаардах бүх мэдээлэл.
 * Оюутан зөвхөн ӨӨРИЙН баримтыг авна.
 */
export async function receipt(id: string, actor: AuthUser) {
  // Оюутан ЗӨВХӨН өөрийн төлөлтийн баримтыг авна — баримтыг уншихаас ӨМНӨ шалгана
  if (actor.role === 'student') {
    if (!actor.studentId) throw forbidden('Оюутны бүртгэл олдсонгүй.');
    const own = await run(supabase.from('payments').select('id').eq('id', id).eq('student_id', actor.studentId).maybeSingle());
    if (!own) throw forbidden('Зөвхөн өөрийн төлбөрийн баримтыг харна.');
  }

  const { data, error } = await supabase.from('payments').select(RECEIPT_SELECT).eq('id', id).maybeSingle();
  let row = data;
  if (error) {
    // receipt_no багана байхгүй (migration ажиллаагүй) бол түүнгүйгээр уншина, бусад алдааг шиднэ
    if (error.code !== '42703' && error.code !== 'PGRST204') throw toHttpError(error);
    row = await run(supabase.from('payments').select(RECEIPT_SELECT.replace('receipt_no, ', '')).eq('id', id).maybeSingle());
  }
  if (!row) throw notFound('Төлөлт олдсонгүй.');

  const p = row as any;

  const general = await getSetting('general');
  const inv = p.invoices ?? {};
  const net = Number(inv.net_amount ?? Number(inv.tuition_amount ?? 0) - Number(inv.discount_amount ?? 0));
  const paid = Number(inv.paid_amount ?? 0);
  const amount = Number(p.amount);

  return {
    id: p.id,
    receipt_no: p.receipt_no ?? null,
    payment_date: p.payment_date,
    method: p.method,
    transaction_reference: p.transaction_reference ?? null,
    description: p.description ?? null,
    amount,
    amount_words: amountInWords(amount),
    organization: {
      name: general.university_name,
      phone: general.academic_office_phone ?? null,
      email: general.support_email ?? null,
    },
    student: {
      code: p.students?.student_code ?? null,
      name: p.students?.users?.full_name ?? null,
      email: p.students?.users?.email ?? null,
      phone: p.students?.users?.phone ?? null,
      class_name: p.students?.classes?.code ?? null,
      program_name: p.students?.classes?.programs?.name ?? null,
    },
    invoice: {
      number: inv.invoice_number ?? null,
      semester: inv.semesters ? `${inv.semesters.academic_year} · ${inv.semesters.name}` : null,
      tuition_amount: Number(inv.tuition_amount ?? 0),
      discount_amount: Number(inv.discount_amount ?? 0),
      net_amount: net,
      paid_amount: paid,
      balance: Math.max(0, net - paid),
      status: inv.status ?? null,
      due_date: inv.due_date ?? null,
    },
  };
}
