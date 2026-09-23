import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BellRing, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, DataTable, ExportButton, PageHeader, Panel, SearchInput, Segmented, StatStrip } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAtRisk, useNotifyAdvisors, type RiskRow } from '@/features/analytics/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { exportExcel } from '@/lib/excel';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/utils';

const LEVEL = { high: { label: 'Өндөр', tone: 'danger' as const }, medium: { label: 'Дунд', tone: 'warn' as const }, low: { label: 'Бага', tone: 'neutral' as const } };

/** Сурлагын эрсдэлийн тайлан — ирц, явцын оноо, GPA, F дүн, өр төлбөрөөр */
export default function AtRiskPage() {
  useDocumentTitle('Сурлагын эрсдэл');
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useAtRisk();
  const notify = useNotifyAdvisors();
  const [level, setLevel] = useState<'all' | 'high' | 'medium'>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data?.rows ?? []).filter((r) => (level === 'all' || r.level === level) && (!s || `${r.full_name} ${r.student_code} ${r.class_name}`.toLowerCase().includes(s)));
  }, [data, level, q]);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.student_id));

  const sendAdvisors = () =>
    notify.mutate([...selected], {
      onSuccess: (r) => {
        toast.success(`${r.advisors} зөвлөх багшид ${r.students} оюутны мэдээлэл илгээгдлээ${r.without_advisor ? ` (${r.without_advisor} оюутны ангид зөвлөх томилоогүй)` : ''}`);
        setSelected(new Set());
      },
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <>
      <PageHeader
        title="Сурлагын эрсдэл"
        description="Ирц, явцын оноо, GPA, F дүн, хугацаа хэтэрсэн төлбөрөөр оюутан бүрт 0–100 эрсдэлийн оноо тооцно. Шалтгаан нь тайлбартай."
        actions={
          <>
            <Button icon={<RefreshCw className="h-4 w-4" />} loading={isFetching} onClick={() => { qc.removeQueries({ queryKey: ['at-risk'] }); void refetch(); }}>Шинэчлэх</Button>
            <ExportButton
              disabled={!rows.length}
              onExport={() =>
                exportExcel('surlagyn-ersdel', 'Эрсдэл', [
                  { header: 'Оноо', value: (r: RiskRow) => r.score },
                  { header: 'Түвшин', value: (r) => LEVEL[r.level].label },
                  { header: 'Код', value: (r) => r.student_code },
                  { header: 'Оюутан', value: (r) => r.full_name, width: 26 },
                  { header: 'Анги', value: (r) => r.class_name },
                  { header: 'Хөтөлбөр', value: (r) => r.program_name, width: 28 },
                  { header: 'Ирц %', value: (r) => r.attendance_rate },
                  { header: 'Явц %', value: (r) => r.progress_pct },
                  { header: 'GPA', value: (r) => r.gpa },
                  { header: 'F', value: (r) => r.f_count },
                  { header: 'Хэтэрсэн өр', value: (r) => r.overdue_amount || '' },
                  { header: 'Шалтгаан', value: (r) => r.reasons.join('; '), width: 60 },
                ], rows)
              }
            />
            <Button variant="primary" icon={<BellRing className="h-4 w-4" />} disabled={!selected.size} loading={notify.isPending} onClick={sendAdvisors}>
              Зөвлөх багшид мэдэгдэх{selected.size ? ` (${selected.size})` : ''}
            </Button>
          </>
        }
      />

      <StatStrip
        className="mb-6"
        loading={isLoading}
        items={[
          { label: 'Идэвхтэй оюутан', value: formatNumber(data?.summary.students) },
          { label: 'Өндөр эрсдэл (≥50)', value: formatNumber(data?.summary.high), tone: data?.summary.high ? 'danger' : 'default' },
          { label: 'Дунд эрсдэл (25–49)', value: formatNumber(data?.summary.medium) },
          { label: 'Тооцсон', value: data ? formatDateTime(data.generated_at) : '—' },
        ]}
      />

      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Оюутан, код, анги" />
          <Segmented value={level} onChange={setLevel} options={[{ value: 'all', label: 'Бүгд' }, { value: 'high', label: 'Өндөр', count: data?.summary.high }, { value: 'medium', label: 'Дунд', count: data?.summary.medium }]} />
        </div>
        <DataTable
          rows={rows}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.student_id}
          pageSize={50}
          empty={{ icon: ShieldCheck, title: 'Эрсдэлтэй оюутан алга', description: 'Бүх оюутны үзүүлэлт хэвийн байна.' }}
          columns={[
            {
              key: 'sel',
              header: <input type="checkbox" aria-label="Бүгдийг сонгох" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.student_id)))} className="h-4 w-4 accent-[#1E4B8F]" />,
              cell: (r) => (
                <input
                  type="checkbox"
                  aria-label="Сонгох"
                  checked={selected.has(r.student_id)}
                  onChange={() => setSelected((s) => { const n = new Set(s); n.has(r.student_id) ? n.delete(r.student_id) : n.add(r.student_id); return n; })}
                  className="h-4 w-4 accent-[#1E4B8F]"
                />
              ),
            },
            {
              key: 'score',
              header: 'Оноо',
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <span className={`num flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${r.level === 'high' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`}>{r.score}</span>
                  <Badge tone={LEVEL[r.level].tone}>{LEVEL[r.level].label}</Badge>
                </div>
              ),
            },
            {
              key: 'student',
              header: 'Оюутан',
              cell: (r) => (
                <Link to={`/academic/students/${r.student_id}`} className="hover:underline">
                  <p className="font-medium">{r.full_name}</p>
                  <p className="num text-[12px] text-muted">{r.student_code} · {r.class_name}</p>
                </Link>
              ),
            },
            {
              key: 'metrics',
              header: 'Үзүүлэлт',
              hideOnMobile: true,
              cell: (r) => (
                <div className="num grid grid-cols-2 gap-x-3 text-[12px] text-muted">
                  <span>Ирц: <b className={r.attendance_rate !== null && r.attendance_rate < 80 ? 'text-danger' : 'text-ink'}>{r.attendance_rate ?? '—'}%</b></span>
                  <span>Явц: <b className={r.progress_pct !== null && r.progress_pct < 60 ? 'text-danger' : 'text-ink'}>{r.progress_pct ?? '—'}%</b></span>
                  <span>GPA: <b className={r.gpa !== null && r.gpa < 2.5 ? 'text-danger' : 'text-ink'}>{r.gpa?.toFixed(2) ?? '—'}</b></span>
                  <span>F: <b className={r.f_count ? 'text-danger' : 'text-ink'}>{r.f_count}</b>{r.overdue_amount ? ` · өр ${formatMoney(r.overdue_amount)}` : ''}</span>
                </div>
              ),
            },
            {
              key: 'reasons',
              header: 'Шалтгаан',
              cell: (r) => (
                <ul className="text-[12px] leading-snug">
                  {r.reasons.map((x) => (
                    <li key={x} className="flex gap-1"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warn" />{x}</li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      </Panel>
      <p className="mt-3 text-[12px] text-faint">
        Оноо: ирц &lt;70% +35, &lt;80% +20, &lt;90% +8 · явц &lt;50% +25, &lt;60% +15 · GPA &lt;2.0 +20, &lt;2.5 +10 · F ≥2 +15, 1 +8 · өр хэтэрсэн +10, 30+ хоног +15. Энэ нь сургагдсан ML загвар биш, тайлбарлагдах дүрэмд суурилсан үнэлгээ.
      </p>
    </>
  );
}
