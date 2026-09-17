import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { DataTable, PageHeader, Panel, SearchInput, Select } from '@/components/ui';
import { usePayments } from '@/features/finance/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { formatDateTime, formatMoney } from '@/lib/utils';

export default function PaymentsPage() {
  useDocumentTitle('Төлөлт');
  const [filters, setFilters] = useState({ q: '', method: '' });
  const { data, isLoading, error, refetch } = usePayments(filters);
  const total = data?.reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <>
      <PageHeader title="Төлөлт" description="Бүртгэгдсэн бүх төлөлт. Шинэ төлөлтийг нэхэмжлэлийн жагсаалтаас бүртгэнэ." />
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
          ]}
        />
      </Panel>
    </>
  );
}
