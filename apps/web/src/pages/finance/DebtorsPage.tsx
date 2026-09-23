import { useMemo, useState } from 'react';
import { BellRing, HandCoins } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DataTable, ExportButton, PageHeader, Panel, SearchInput, Segmented, Select, StatStrip, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDebtors, useRemind, type Debtor } from '@/features/finance/automation';
import { useCurrentSemester, useSemesters } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { INVOICE_STATUS_LABEL } from '@/lib/constants';
import { exportExcel } from '@/lib/excel';
import { formatDate, formatDateTime, formatMoney, formatNumber, timeAgo } from '@/lib/utils';

/** Өр төлбөр — хугацаа хэтэрсэн, төлөгдөөгүй нэхэмжлэл, сануулга илгээх */
export default function DebtorsPage() {
  useDocumentTitle('Өр төлбөр');
  const toast = useToast();
  const { can } = useRole();
  const editable = can('finance');
  const { data: current } = useCurrentSemester();
  const { data: semesters } = useSemesters();
  const [semesterId, setSemesterId] = useState('');
  const [scope, setScope] = useState<'all' | 'overdue'>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const debtors = useDebtors({ semester_id: semesterId || current?.id, overdue_only: scope === 'overdue' });
  const remind = useRemind();

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (debtors.data ?? []).filter((r) => !s || `${r.student_name} ${r.student_code} ${r.invoice_number}`.toLowerCase().includes(s));
  }, [debtors.data, q]);

  const all = debtors.data ?? [];
  const overdue = all.filter((r) => r.days_overdue > 0);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectedTotal = rows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.balance, 0);

  const send = () =>
    remind.mutate(
      { ids: [...selected], message: message.trim() || null },
      {
        onSuccess: (r) => {
          toast.success(`${formatNumber(r.reminded)} оюутанд сануулга илгээгдлээ`);
          setSelected(new Set());
          setConfirm(false);
          setMessage('');
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );

  return (
    <>
      <PageHeader
        title="Өр төлбөр"
        description="Төлөгдөөгүй үлдэгдэлтэй нэхэмжлэл. Систем хугацаа дуусахаас 3 хоногийн өмнө, хугацаа хэтэрсэн бол долоо хоног тутам автоматаар сануулна."
        actions={
          <>
            <ExportButton
              disabled={!rows.length}
              onExport={() =>
                exportExcel('or-tolbor', 'Өр төлбөр', [
                  { header: 'Нэхэмжлэл', value: (r: Debtor) => r.invoice_number },
                  { header: 'Оюутны код', value: (r) => r.student_code },
                  { header: 'Оюутан', value: (r) => r.student_name, width: 26 },
                  { header: 'Улирал', value: (r) => r.semester_name, width: 16 },
                  { header: 'Төлөх', value: (r) => r.net_amount },
                  { header: 'Төлсөн', value: (r) => r.paid_amount },
                  { header: 'Үлдэгдэл', value: (r) => r.balance },
                  { header: 'Төлөх хугацаа', value: (r) => r.due_date },
                  { header: 'Хэтэрсэн хоног', value: (r) => r.days_overdue || '' },
                  { header: 'Сануулсан', value: (r) => r.reminder_count },
                  { header: 'Сүүлд сануулсан', value: (r) => (r.last_reminded_at ? formatDateTime(r.last_reminded_at) : '') },
                ], rows)
              }
            />
            {editable && (
              <Button variant="primary" icon={<BellRing className="h-4 w-4" />} disabled={!selected.size} onClick={() => setConfirm(true)}>
                Сануулга илгээх{selected.size ? ` (${selected.size})` : ''}
              </Button>
            )}
          </>
        }
      />

      <StatStrip
        className="mb-6"
        loading={debtors.isLoading}
        items={[
          { label: 'Өртэй нэхэмжлэл', value: formatNumber(all.length) },
          { label: 'Нийт үлдэгдэл', value: formatMoney(all.reduce((s, r) => s + r.balance, 0)) },
          { label: 'Хугацаа хэтэрсэн', value: formatNumber(overdue.length), tone: overdue.length ? 'danger' : 'default' },
          { label: 'Хэтэрсэн дүн', value: formatMoney(overdue.reduce((s, r) => s + r.balance, 0)), tone: overdue.length ? 'danger' : 'default' },
        ]}
      />

      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Оюутан, код, нэхэмжлэл" />
          <Select className="sm:w-52" value={semesterId || current?.id || ''} onChange={(e) => setSemesterId(e.target.value)} options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))} />
          <Segmented value={scope} onChange={setScope} options={[{ value: 'all', label: 'Бүгд' }, { value: 'overdue', label: 'Хугацаа хэтэрсэн', count: overdue.length }]} />
          {selected.size > 0 && <p className="num text-[13px] text-accent sm:ml-auto">{selected.size} сонгосон · {formatMoney(selectedTotal)}</p>}
        </div>
        <DataTable
          rows={rows}
          loading={debtors.isLoading}
          error={debtors.error}
          onRetry={debtors.refetch}
          rowKey={(r) => r.id}
          pageSize={50}
          empty={{ icon: HandCoins, title: 'Өр төлбөргүй 🎉', description: 'Бүх нэхэмжлэл төлөгдсөн байна.' }}
          columns={[
            ...(editable
              ? [
                  {
                    key: 'sel',
                    header: <input type="checkbox" aria-label="Бүгдийг сонгох" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#1E4B8F]" />,
                    cell: (r: Debtor) => <input type="checkbox" aria-label="Сонгох" checked={selected.has(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 accent-[#1E4B8F]" />,
                  },
                ]
              : []),
            {
              key: 'student',
              header: 'Оюутан',
              cell: (r) => (
                <div>
                  <p className="font-medium">{r.student_name}</p>
                  <p className="num text-[12px] text-muted">{r.student_code} · {r.invoice_number}</p>
                </div>
              ),
            },
            { key: 'balance', header: 'Үлдэгдэл', align: 'right', cell: (r) => <span className="num font-semibold">{formatMoney(r.balance)}</span> },
            { key: 'paid', header: 'Төлсөн', align: 'right', hideOnMobile: true, cell: (r) => <span className="num text-muted">{formatMoney(r.paid_amount)} / {formatMoney(r.net_amount)}</span> },
            {
              key: 'due',
              header: 'Хугацаа',
              cell: (r) =>
                r.due_date ? (
                  <div>
                    <p className="num">{formatDate(r.due_date)}</p>
                    {r.days_overdue > 0 ? <Badge tone="danger">{r.days_overdue} хоног хэтэрсэн</Badge> : <Badge tone="neutral">{INVOICE_STATUS_LABEL[r.status]}</Badge>}
                  </div>
                ) : (
                  <span className="text-faint">—</span>
                ),
            },
            {
              key: 'reminded',
              header: 'Сануулга',
              hideOnMobile: true,
              cell: (r) => (r.last_reminded_at ? <span className="text-[12px] text-muted">{r.reminder_count} удаа · {timeAgo(r.last_reminded_at)}</span> : <span className="text-[12px] text-faint">Сануулаагүй</span>),
            },
          ]}
        />
      </Panel>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={send}
        loading={remind.isPending}
        title="Төлбөрийн сануулга илгээх үү?"
        description={`${selected.size} оюутанд үлдэгдэл, төлөх хугацааг агуулсан мэдэгдэл (push) илгээнэ.`}
        confirmLabel="Илгээх"
      >
        <Textarea label="Нэмэлт мессеж (заавал биш)" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Санхүүгийн албанд 201 тоот өрөөнд хандана уу." maxLength={500} />
      </ConfirmDialog>
    </>
  );
}
