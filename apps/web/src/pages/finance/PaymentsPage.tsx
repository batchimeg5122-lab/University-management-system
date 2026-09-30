import { useState } from 'react';
import { CreditCard, Receipt } from 'lucide-react';
import { Button, DataTable, ExportButton, PageHeader, Panel, SearchInput, Select } from '@/components/ui';
import { exportExcel } from '@/lib/excel';
import { ReceiptModal } from '@/features/finance/components/ReceiptModal';
import { usePayments } from '@/features/finance/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { formatDateTime, formatMoney } from '@/lib/utils';

export default function PaymentsPage() {
  useDocumentTitle('Төлөлт');
  const [filters, setFilters] = useState({ q: '', method: '' });
  const { data, isLoading, error, refetch } = usePayments(filters);
  const total = data?.reduce((s, p) => s + p.amount, 0) ?? 0;
  /** Баримт харах/татах — сонгосон төлөлт */
  const [receiptId, setReceiptId] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Төлөлт"
        description="Бүртгэгдсэн бүх төлөлт. Шинэ төлөлтийг нэхэмжлэлийн жагсаалтаас бүртгэнэ."
        actions={
          <ExportButton
            disabled={!data?.length}
            onExport={() =>
              exportExcel('tolbor', 'Төлөлт', [
                { header: 'Огноо', value: (r) => formatDateTime(r.payment_date), width: 18 },
                { header: 'Оюутны код', value: (r) => r.student_code },
                { header: 'Оюутан', value: (r) => r.student_name, width: 28 },
                { header: 'Нэхэмжлэл', value: (r) => r.invoice_number },
                { header: 'Дүн', value: (r) => Number(r.amount) },
                { header: 'Хэлбэр', value: (r) => PAYMENT_METHOD_LABEL[r.method] },
                { header: 'Гүйлгээний дугаар', value: (r) => r.transaction_reference, width: 22 },
                { header: 'Баримтын дугаар', value: (r) => r.receipt_no, width: 18 },
                { header: 'Тайлбар', value: (r) => r.description, width: 30 },
              ], data ?? [])
            }
          />
        }
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} placeholder="Оюутан, нэхэмжлэлийн дугаар" />
          <Select className="sm:w-48" value={filters.method} onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))} placeholder="Бүх хэлбэр" options={Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({ value, label }))} />
          <p className="num text-[13px] text-muted sm:ml-auto">
            {data?.length ?? 0} төлөлт, нийт <span className="font-semibold text-ink">{formatMoney(total)}</span>
          </p>
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          empty={{ icon: CreditCard, title: 'Төлөлт олдсонгүй' }}
          columns={[
            { key: 'date', header: 'Огноо', cell: (r) => <span className="num text-muted">{formatDateTime(r.payment_date)}</span> },
            { key: 'student', header: 'Оюутан', cell: (r) => <div><p className="font-medium">{r.student_name}</p><p className="text-xs text-faint">{r.student_code}</p></div> },
            { key: 'invoice', header: 'Нэхэмжлэл', hideOnMobile: true, cell: (r) => <span className="num text-muted">{r.invoice_number}</span> },
            { key: 'method', header: 'Хэлбэр', cell: (r) => PAYMENT_METHOD_LABEL[r.method] },
            { key: 'ref', header: 'Гүйлгээ', hideOnMobile: true, cell: (r) => <span className="num text-muted">{r.transaction_reference ?? '—'}</span> },
            { key: 'amount', header: 'Дүн', align: 'right', cell: (r) => <span className="num font-semibold">{formatMoney(r.amount)}</span> },
            {
              key: 'receipt',
              header: 'Баримт',
              align: 'right',
              cell: (r) => (
                <Button size="sm" icon={<Receipt className="h-3.5 w-3.5" />} onClick={() => setReceiptId(r.id)} title="Төлбөр төлсөн баримт харах, татах">
                  Баримт
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />
    </>
  );
}
