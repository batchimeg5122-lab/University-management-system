import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Button, DataTable, ErrorState, ExportButton, PageHeader, PageLoader, Panel, ProgressBar } from '@/components/ui';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import { ReceiptModal } from '@/features/finance/components/ReceiptModal';
import { useMyInvoices, useMyPayments } from '@/features/finance/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { exportExcel } from '@/lib/excel';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';

export default function MyFinancePage() {
  useDocumentTitle('Төлбөр');
  const invoices = useMyInvoices();
  const payments = useMyPayments();
  const current = invoices.data?.[0];
  /** Төлбөр төлсөн баримт харах — сонгосон төлөлт */
  const [receiptId, setReceiptId] = useState<string | null>(null);

  if (invoices.error) return <ErrorState error={invoices.error} onRetry={invoices.refetch} />;

  const balance = current ? Math.max(0, current.net_amount - current.paid_amount) : 0;

  return (
    <>
      <PageHeader
        title="Сургалтын төлбөр"
        description="Нэхэмжлэл, хөнгөлөлт болон төлөлтийн түүх. Төлөлт бүрийн баримтыг PDF болгон татаж авна."
        actions={
          <ExportButton
            label="Төлөлтийн түүх"
            disabled={!payments.data?.length}
            onExport={() =>
              exportExcel('miniy-tololt', 'Төлөлт', [
                { header: 'Огноо', value: (r) => formatDateTime(r.payment_date), width: 18 },
                { header: 'Баримтын дугаар', value: (r) => r.receipt_no, width: 18 },
                { header: 'Нэхэмжлэл', value: (r) => r.invoice_number, width: 18 },
                { header: 'Дүн', value: (r) => Number(r.amount) },
                { header: 'Хэлбэр', value: (r) => PAYMENT_METHOD_LABEL[r.method] },
                { header: 'Гүйлгээний дугаар', value: (r) => r.transaction_reference, width: 22 },
              ], payments.data ?? [])
            }
          />
        }
      />

      {invoices.isLoading ? (
        <PageLoader />
      ) : current ? (
        <Panel className="mb-6" bodyClassName="p-0">
          <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[15px] font-semibold text-ink">{current.semester_name}</p>
                <InvoiceStatusBadge status={current.status} />
              </div>
              <p className="mt-0.5 text-[13px] text-muted">
                {current.invoice_number}, төлөх хугацаа {formatDate(current.due_date)}
              </p>

              <dl className="mt-6 flex flex-col text-sm">
                {[
                  ['Сургалтын төлбөр', formatMoney(current.tuition_amount)],
                  [`Хөнгөлөлт${current.discount_note ? ` (${current.discount_note})` : ''}`, current.discount_amount ? `−${formatMoney(current.discount_amount)}` : formatMoney(0)],
                  ['Төлөх дүн', formatMoney(current.net_amount)],
                  ['Төлсөн', formatMoney(current.paid_amount)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-dashed border-line py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className="num font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col justify-between gap-6 border-t border-line bg-paper/60 p-6 lg:border-l lg:border-t-0">
              <div>
                <p className="text-[13px] text-muted">Үлдэгдэл</p>
                <p className={`num mt-1 text-[32px] font-semibold tracking-[-0.02em] ${balance ? 'text-ink' : 'text-success'}`}>{formatMoney(balance)}</p>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-[13px]">
                  <span className="text-muted">Төлөлтийн явц</span>
                  <span className="num font-medium">{Math.round((current.paid_amount / (current.net_amount || 1)) * 100)}%</span>
                </div>
                <ProgressBar value={current.paid_amount} max={current.net_amount} tone={balance ? 'accent' : 'success'} />
                <p className="mt-4 text-xs leading-relaxed text-faint">
                  Төлбөрөө QPay эсвэл сургуулийн дансаар төлөхдөө гүйлгээний утгад оюутны кодоо заавал бичнэ үү.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel flush title="Төлөлтийн түүх">
          <DataTable
            rows={payments.data}
            loading={payments.isLoading}
            rowKey={(r) => r.id}
            dense
            empty={{ title: 'Төлөлт бүртгэгдээгүй байна' }}
            columns={[
              { key: 'date', header: 'Огноо', cell: (r) => <span className="num">{formatDate(r.payment_date)}</span> },
              { key: 'method', header: 'Хэлбэр', cell: (r) => <span className="text-muted">{PAYMENT_METHOD_LABEL[r.method]}</span> },
              { key: 'amount', header: 'Дүн', align: 'right', cell: (r) => <span className="num font-medium">{formatMoney(r.amount)}</span> },
              {
                key: 'receipt',
                header: 'Баримт',
                align: 'right',
                cell: (r) => (
                  <Button size="sm" variant="ghost" icon={<Receipt className="h-3.5 w-3.5" />} onClick={() => setReceiptId(r.id)} title="Төлбөр төлсөн баримт">
                    Баримт
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
        <Panel flush title="Нэхэмжлэлүүд">
          <DataTable
            rows={invoices.data}
            rowKey={(r) => r.id}
            dense
            columns={[
              { key: 'sem', header: 'Улирал', cell: (r) => r.semester_name },
              { key: 'net', header: 'Төлөх', align: 'right', cell: (r) => <span className="num">{formatMoney(r.net_amount)}</span> },
              { key: 'status', header: 'Төлөв', align: 'right', cell: (r) => <InvoiceStatusBadge status={r.status} /> },
            ]}
          />
        </Panel>
      </div>
      <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />
    </>
  );
}
