import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { BarChart, Button, EmptyState, ErrorState, LineChart, PageHeader, PageLoader, Panel, StatStrip } from '@/components/ui';
import { analyticsApi, useTrends } from '@/features/analytics/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/utils';

const delta = (a: number | null | undefined, b: number | null | undefined, digits = 1) =>
  a === null || a === undefined || b === null || b === undefined ? null : Math.round((a - b) * 10 ** digits) / 10 ** digits;

/** Сүүлийн улирлуудын хандлага — удирдлагын шийдвэр гаргалтад */
export default function TrendsPage() {
  useDocumentTitle('Хандлага');
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useTrends();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const s = data?.semesters ?? [];
  if (!s.length) return <EmptyState icon={TrendingUp} title="Улирлын өгөгдөл алга" />;

  const last = s[s.length - 1];
  const prev = s[s.length - 2];
  const labels = s.map((x) => x.label);
  const sign = (v: number | null, suffix = '') => (v === null ? '' : `${v > 0 ? '▲' : v < 0 ? '▼' : '•'} ${Math.abs(v)}${suffix} өмнөхөөс`);

  return (
    <>
      <PageHeader
        title="Хандлага"
        description={`Сүүлийн ${s.length} улирлын үзүүлэлт. Тооцоолсон: ${formatDateTime(data!.generated_at)}`}
        actions={
          <Button
            icon={<RefreshCw className="h-4 w-4" />}
            loading={isFetching}
            onClick={async () => {
              const fresh = await analyticsApi.trends(true);
              qc.setQueryData(['trends'], fresh);
            }}
          >
            Дахин тооцох
          </Button>
        }
      />

      <StatStrip
        className="mb-6"
        items={[
          { label: `Дундаж голч · ${last.label}`, value: last.avg_gpa?.toFixed(2) ?? '—', sub: sign(delta(last.avg_gpa, prev?.avg_gpa, 2)) },
          { label: 'Ирц', value: last.attendance_rate !== null ? `${last.attendance_rate}%` : '—', sub: sign(delta(last.attendance_rate, prev?.attendance_rate), '%') },
          { label: 'Төлбөр цуглуулалт', value: last.collection_rate !== null ? `${last.collection_rate}%` : '—', sub: `${formatMoney(last.collected)} / ${formatMoney(last.invoiced)}` },
          { label: 'Хичээл бүртгэл', value: formatNumber(last.enrollments), sub: `${formatNumber(last.courses)} хичээл` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Сурлага" description="Баталгаажсан дүнгийн жигнэсэн голч, F-ийн хувь">
          <LineChart
            labels={labels}
            yMin={0}
            yMax={4}
            series={[
              { name: 'Дундаж GPA', values: s.map((x) => x.avg_gpa), color: '#1E4B8F', format: (v) => v.toFixed(2) },
              { name: 'F хувь (÷25)', values: s.map((x) => (x.fail_rate === null ? null : x.fail_rate / 25)), color: '#B42318', format: (v) => `${(v * 25).toFixed(1)}%` },
            ]}
          />
        </Panel>
        <Panel title="Ирц ба төлбөр цуглуулалт" description="Хувиар">
          <LineChart
            labels={labels}
            yMin={0}
            yMax={100}
            series={[
              { name: 'Ирц', values: s.map((x) => x.attendance_rate), color: '#1F7A4D', format: (v) => `${v}%` },
              { name: 'Төлбөр цуглуулалт', values: s.map((x) => x.collection_rate), color: '#B8862B', format: (v) => `${v}%` },
            ]}
          />
        </Panel>
        <Panel title="Хичээл бүртгэл" description="Улирал бүрийн оюутан-хичээлийн бүртгэлийн тоо">
          <BarChart labels={s.map((x) => x.label.split(' ').slice(-1)[0] + ' ' + x.label.slice(2, 4))} values={s.map((x) => x.enrollments)} format={(v) => formatNumber(v)} />
        </Panel>
        <Panel title="Элсэлт ба тогтвортой суралцалт" description="Элссэн он бүрээр: нийт элсэгч, хасагдаагүй хувь">
          <BarChart labels={(data?.intake ?? []).map((i) => String(i.year))} values={(data?.intake ?? []).map((i) => i.total)} color="#6E9BE0" format={(v) => formatNumber(v)} />
          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted">
            {(data?.intake ?? []).map((i) => (
              <span key={i.year}>
                {i.year}: <b className="num text-ink">{i.retention ?? '—'}%</b>
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
