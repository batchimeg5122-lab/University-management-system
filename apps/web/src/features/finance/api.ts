import { get, patch, post } from '@/lib/api';
import type { Invoice, Payment } from '@/types/models';
import type { FinanceReport } from '@/types/reports';

export type InvoiceFilters = { status?: string; semester_id?: string; q?: string };

export const financeApi = {
  invoices: (params: InvoiceFilters) => get<Invoice[]>('/invoices', params),
  createInvoice: (body: Partial<Invoice>) => post<Invoice>('/invoices', body),
  updateInvoice: (id: string, body: Partial<Invoice>) => patch<Invoice>(`/invoices/${id}`, body),
  myInvoices: () => get<Invoice[]>('/invoices/me'),
  payments: (params: { q?: string; method?: string }) => get<Payment[]>('/payments', params),
  createPayment: (body: Partial<Payment>) => post<Payment>('/payments', body),
  myPayments: () => get<Payment[]>('/payments/me'),
  report: (semester_id?: string) => get<FinanceReport>('/reports/finance', { semester_id }),
  /** Төлбөр төлсөн баримт — оюутан зөвхөн өөрийнхөө */
  receipt: (paymentId: string) => get<PaymentReceipt>(`/payments/${paymentId}/receipt`),
};

/** Баримт хэвлэхэд шаардах бүх мэдээлэл (серверээс) */
export interface PaymentReceipt {
  id: string;
  receipt_no: string | null;
  payment_date: string;
  method: string;
  transaction_reference: string | null;
  description: string | null;
  amount: number;
  /** Дүн үгээр — "нэг сая хоёр зуун тавин мянган төгрөг" */
  amount_words: string;
  organization: { name: string; phone: string | null; email: string | null };
  student: { code: string | null; name: string | null; email: string | null; phone: string | null; class_name: string | null; program_name: string | null };
  invoice: {
    number: string | null;
    semester: string | null;
    tuition_amount: number;
    discount_amount: number;
    net_amount: number;
    paid_amount: number;
    balance: number;
    status: string | null;
    due_date: string | null;
  };
}
