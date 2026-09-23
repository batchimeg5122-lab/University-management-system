import { useState } from 'react';
import { Layers, Plus, Receipt } from 'lucide-react';
import { Button, DataTable, ExportButton, PageHeader, Panel, SearchInput, Select } from '@/components/ui';
import { exportExcel } from '@/lib/excel';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import { BulkInvoiceModal } from '@/features/finance/components/BulkInvoiceModal';
import { InvoiceModal } from '@/features/finance/components/InvoiceModal';
import { PaymentModal } from '@/features/finance/components/PaymentModal';
import { useInvoices } from '@/features/finance/hooks';
import { useCurrentSemester, useSemesters } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { INVOICE_STATUS_LABEL } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/utils';
import type { Invoice } from '@/types/models';

export default function InvoicesPage() {
  useDocumentTitle('Нэхэмжлэл');
  const { can } = useRole();
  const { data: current } = useCurrentSemester();
  const { data: semesters } = useSemesters();
  const [filters, setFilters] = useState({ q: '', status: '', semester_id: '' });
  const semesterId = filters.semester_id || current?.id || '';
  const { data, isLoading, error, refetch } = useInvoices({ ...filters, semester_id: semesterId });
  const [editing, setEditing] = useState<Invoice | null | 'new'>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [bulk, setBulk] = useState(false);

  const totals = data?.reduce((s, i) => ({ net: s.net + i.net_amount, paid: s.paid + i.paid_amount }), { net: 0, paid: 0 });

  return (
    <>
      <PageHeader
        title="Нэхэмжлэл"
        description="Оюутны сургалтын төлбөрийн нэхэмжлэл, хөнгөлөлт, үлдэгдэл."
        actions={
          <>
            <ExportButton
              disabled={!data?.length}
              onExport={() =>
                exportExcel('nekhemjlel', 'Нэхэмжлэл', [
                  { header: 'Дугаар', value: (r: Invoice) => r.invoice_number },
                  { header: 'Оюутны код', value: (r) => r.student_code },
                  { header: 'Оюутан', value: (r) => r.student_name, width: 28 },
                  { header: 'Улирал', value: (r) => r.semester_name, width: 18 },
                  { header: 'Сургалтын төлбөр', value: (r) => Number(r.tuition_amount), width: 18 },
                  { header: 'Хөнгөлөлт', value: (r) => Number(r.discount_amount) },
                  { header: 'Төлөх', value: (r) => Number(r.net_amount) },
                  { header: 'Төлсөн', value: (r) => Number(r.paid_amount) },
                  { header: 'Үлдэгдэл', value: (r) => Math.max(0, Number(r.net_amount) - Number(r.paid_amount)) },
                  { header: 'Төлөх хугацаа', value: (r) => (r.due_date ? formatDate(r.due_date) : '') },
                  { header: 'Төлөв', value: (r) => INVOICE_STATUS_LABEL[r.status] },
                ], data ?? [])
              }
            />
            {can('finance') && (
              <>
                <Button icon={<Layers className="h-4 w-4" />} onClick={() => setBulk(true)}>Бөөнөөр үүсгэх</Button>
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Нэхэмжлэл үүсгэх</Button>
              </>
            )}
          </>
        }
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 lg:flex-row lg:items-center">
          <SearchInput value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} placeholder="Оюутан, код, нэхэмжлэлийн дугаар" />
          <Select className="lg:w-56" value={semesterId} onChange={(e) => setFilters((f) => ({ ...f, semester_id: e.target.value }))} options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))} />
          <Select className="lg:w-48" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} placeholder="Бүх төлөв" options={Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
          {totals && (
            <p className="num text-[13px] text-muted lg:ml-auto">
              Үлдэгдэл <span className="font-semibold text-ink">{formatMoney(totals.net - totals.paid)}</span>
            </p>
          )}
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          empty={{ icon: Receipt, title: 'Нэхэмжлэл олдсонгүй' }}
          columns={[
            { key: 'student', header: 'Оюутан', cell: (r) => <div><p className="font-medium">{r.student_name}</p><p className="text-xs text-faint">{r.student_code}, {r.invoice_number}</p></div> },
            { key: 'net', header: 'Төлөх', align: 'right', cell: (r) => (
              <div className="num">
                <p>{formatMoney(r.net_amount)}</p>
                {r.discount_amount > 0 && <p className="text-xs text-faint">−{formatMoney(r.discount_amount)} хөнгөлөлт</p>}
              </div>
            ) },
            { key: 'paid', header: 'Төлсөн', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{formatMoney(r.paid_amount)}</span> },
            { key: 'balance', header: 'Үлдэгдэл', align: 'right', cell: (r) => <span className="num font-medium">{formatMoney(Math.max(0, r.net_amount - r.paid_amount))}</span> },
            { key: 'due', header: 'Хугацаа', hideOnMobile: true, cell: (r) => <span className="num text-muted">{formatDate(r.due_date)}</span> },
            { key: 'status', header: 'Төлөв', cell: (r) => <InvoiceStatusBadge status={r.status} /> },
            {
              key: 'actions', header: '', align: 'right',
              cell: (r) => can('finance') && (
                <div className="flex justify-end gap-1">
                  {r.status !== 'paid' && r.status !== 'cancelled' && <Button size="sm" variant="subtle" onClick={() => setPaying(r)}>Төлөлт</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Засах</Button>
                </div>
              ),
            },
          ]}
        />
      </Panel>
      <InvoiceModal open={!!editing} invoice={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <PaymentModal invoice={paying} onClose={() => setPaying(null)} />
      <BulkInvoiceModal open={bulk} onClose={() => setBulk(false)} />
    </>
  );
}
