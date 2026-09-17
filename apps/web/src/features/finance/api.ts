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
};
