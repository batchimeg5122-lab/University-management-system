import { get } from './client';
import type { Invoice, Payment, PaymentReceipt } from '../types/models';

export const financeApi = {
  invoices: () => get<Invoice[]>('/invoices/me'),
  payments: () => get<Payment[]>('/payments/me'),
  /** Төлбөр төлсөн баримт — зөвхөн өөрийн төлөлт */
  receipt: (paymentId: string) => get<PaymentReceipt>(`/payments/${paymentId}/receipt`),
};
