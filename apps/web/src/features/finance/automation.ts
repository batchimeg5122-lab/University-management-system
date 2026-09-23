import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post, put } from '@/lib/api';
import type { Invoice } from '@/types/models';

// ---------------------------------------------------------------- Хөнгөлөлтийн дүрэм
export type RuleKind = 'gpa' | 'program' | 'year_level' | 'students';
export interface DiscountRule {
  id: string;
  name: string;
  kind: RuleKind;
  percent: number | null;
  amount: number | null;
  params: { min_gpa?: number; program_ids?: string[]; year_levels?: number[]; student_codes?: string[] };
  stackable: boolean;
  is_active: boolean;
  note: string | null;
}
export type RuleInput = Omit<DiscountRule, 'id'>;

export const RULE_KIND_LABEL: Record<RuleKind, string> = {
  gpa: 'Голч дүнгээр',
  program: 'Хөтөлбөрөөр',
  year_level: 'Курсээр',
  students: 'Оюутны жагсаалт',
};

// ---------------------------------------------------------------- Бөөнөөр нэхэмжлэх
export type ScopeKind = 'all' | 'school' | 'program' | 'class' | 'students';
export interface BulkInvoiceInput {
  semester_id?: string | null;
  scope: { kind: ScopeKind; ids: string[]; student_codes: string[] };
  mode: 'fixed' | 'per_credit';
  amount: number;
  due_date?: string | null;
  description?: string | null;
  apply_rules: boolean;
  skip_existing: boolean;
}
export interface BulkPreviewRow {
  student_id: string;
  student_code: string;
  student_name: string;
  program_name: string | null;
  class_name: string | null;
  gpa: number | null;
  credits: number;
  tuition: number;
  discount: number;
  discount_note: string | null;
  net: number;
  existing_invoice: string | null;
  skip: 'existing' | 'no_credit' | null;
}
export interface BulkPreview {
  semester_id: string;
  rows: BulkPreviewRow[];
  totals: { students: number; create: number; skipped: number; tuition: number; discount: number; net: number; with_discount: number };
}

// ---------------------------------------------------------------- Өр төлбөр
export interface Debtor extends Invoice {
  balance: number;
  days_overdue: number;
  last_reminded_at: string | null;
  reminder_count: number;
}

// ---------------------------------------------------------------- Банкны хуулга
export interface StatementRow {
  row: number;
  date?: string | null;
  amount: number;
  description: string;
  reference?: string | null;
  student_code?: string | null;
  invoice_number?: string | null;
}
export type MatchStatus = 'matched' | 'overpaid' | 'duplicate' | 'unmatched' | 'ambiguous' | 'no_invoice' | 'skip';
export interface ReconcileRow extends StatementRow {
  status: MatchStatus;
  payment_date: string | null;
  student_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  semester_name?: string | null;
  balance?: number;
  note?: string | null;
  candidates?: string[];
}
export interface ReconcileResult {
  rows: ReconcileRow[];
  summary: { total: number; matched: number; overpaid: number; duplicate: number; unmatched: number; skipped: number; ready_amount: number };
}

export const automationApi = {
  rules: () => get<DiscountRule[]>('/discount-rules'),
  createRule: (b: RuleInput) => post<DiscountRule>('/discount-rules', b),
  updateRule: (id: string, b: RuleInput) => put<DiscountRule>(`/discount-rules/${id}`, b),
  toggleRule: (id: string, is_active: boolean) => patch<DiscountRule>(`/discount-rules/${id}`, { is_active }),
  deleteRule: (id: string) => del<{ deleted: boolean }>(`/discount-rules/${id}`),

  bulkPreview: (b: BulkInvoiceInput) => post<BulkPreview>('/invoices/bulk/preview', b),
  bulkCreate: (b: BulkInvoiceInput) => post<{ created: number; skipped: number; total_net: number; total_discount: number }>('/invoices/bulk', b),

  debtors: (params: { overdue_only?: boolean; semester_id?: string }) => get<Debtor[]>('/invoices/debtors', params),
  remind: (invoice_ids: string[], message?: string | null) => post<{ reminded: number }>('/invoices/remind', { invoice_ids, message }),

  reconcile: (rows: StatementRow[]) => post<ReconcileResult>('/payments/reconcile/preview', { rows }),
  importPayments: (rows: { invoice_id: string; amount: number; payment_date?: string | null; transaction_reference?: string | null; description?: string | null }[]) =>
    post<{ created: number; duplicates: number; errors: { invoice_id: string; message: string }[]; invoices_updated: number }>('/payments/bulk', { rows }),
};

function useInvalidate() {
  const qc = useQueryClient();
  return () => ['invoices', 'payments', 'reports', 'debtors', 'discount-rules'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export const useDiscountRules = () => useQuery({ queryKey: ['discount-rules'], queryFn: automationApi.rules });
export function useSaveRule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: ({ id, ...b }: RuleInput & { id?: string }) => (id ? automationApi.updateRule(id, b) : automationApi.createRule(b)), onSuccess: done });
}
export function useToggleRule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => automationApi.toggleRule(id, is_active), onSuccess: done });
}
export function useDeleteRule() {
  const done = useInvalidate();
  return useMutation({ mutationFn: automationApi.deleteRule, onSuccess: done });
}
export function useBulkInvoices() {
  const done = useInvalidate();
  return useMutation({ mutationFn: automationApi.bulkCreate, onSuccess: done });
}
export const useDebtors = (p: { overdue_only?: boolean; semester_id?: string }) =>
  useQuery({ queryKey: ['debtors', p], queryFn: () => automationApi.debtors(p), placeholderData: (x) => x });
export function useRemind() {
  const done = useInvalidate();
  return useMutation({ mutationFn: ({ ids, message }: { ids: string[]; message?: string | null }) => automationApi.remind(ids, message), onSuccess: done });
}
export function useImportPayments() {
  const done = useInvalidate();
  return useMutation({ mutationFn: automationApi.importPayments, onSuccess: done });
}
