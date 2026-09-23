import { get } from './client';
import type { Invoice, Payment } from '../types/models';

export const financeApi = {
  invoices: () => get<Invoice[]>('/invoices/me'),
  payments: () => get<Payment[]>('/payments/me'),
};
