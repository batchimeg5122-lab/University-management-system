import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, type InvoiceFilters } from './api';
import type { Invoice, Payment } from '@/types/models';

export const useInvoices = (f: InvoiceFilters) => useQuery({ queryKey: ['invoices', f], queryFn: () => financeApi.invoices(f), placeholderData: (p) => p });
export const useMyInvoices = () => useQuery({ queryKey: ['invoices', 'me'], queryFn: financeApi.myInvoices });
export const usePayments = (f: { q?: string; method?: string }) => useQuery({ queryKey: ['payments', f], queryFn: () => financeApi.payments(f), placeholderData: (p) => p });
export const useMyPayments = () => useQuery({ queryKey: ['payments', 'me'], queryFn: financeApi.myPayments });
export const useFinanceReport = (semesterId?: string) => useQuery({ queryKey: ['reports', 'finance', semesterId], queryFn: () => financeApi.report(semesterId) });

function useInvalidateFinance() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
    qc.invalidateQueries({ queryKey: ['reports'] });
  };
}

export function useSaveInvoice() {
  const done = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Invoice> & { id?: string }) => (id ? financeApi.updateInvoice(id, body) : financeApi.createInvoice(body)),
    onSuccess: done,
  });
}
export function useRecordPayment() {
  const done = useInvalidateFinance();
  return useMutation({ mutationFn: (b: Partial<Payment>) => financeApi.createPayment(b), onSuccess: done });
}
