import { Link } from 'react-router-dom';
import { BarList } from '@/components/charts/BarList';
import { SemesterTimeline } from '@/components/charts/SemesterTimeline';
import { PageHeader, PageLoader, Panel, ProgressBar, StatStrip } from '@/components/ui';
import { useFinanceReport } from '@/features/finance/hooks';
import { useOverview, useSchoolReports } from '@/features/reports/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { percent } from '@/lib/utils';

export default function ManagementDashboard() {
  useDocumentTitle('Нэгдсэн тойм');
  const { data: o, isLoading } = useOverview();
  const { data: schools } = useSchoolReports();
  const { data: finance } = useFinanceReport();

  return (
    <>
      <PageHeader title="Нэгдсэн тойм" description="Их сургуулийн хэмжээний сургалт, санхүүгийн гол үзүүлэлтүүд." />
      <SemesterTimeline className="mb-4" />
      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Оюутан', value: o?.total_students ?? 0, sub: `${o?.total_schools ?? 0} сургуульд` },
          { label: 'Багш', value: o?.total_teachers ?? 0, sub: `${o?.active_courses ?? 0} хичээл заагдаж байна` },
          { label: 'Дундаж голч', value: o?.avg_gpa.toFixed(2) ?? '—' },
          { label: 'Дундаж ирц', value: percent(o?.avg_attendance, 1) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Сургуулиар оюутны тоо" actions={<Link to="/management/schools" className="text-[13px] font-medium text-accent hover:underline">Дэлгэрэнгүй</Link>}>
          {schools ? <BarList items={[...schools].sort((a, b) => b.students - a.students).map((s) => ({ label: s.name, value: s.students }))} /> : <PageLoader />}
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Төлбөр цуглуулалт" description="Одоогийн улирал">
            <p className="num text-[32px] font-semibold tracking-[-0.02em]">{percent(o?.collection_rate, 1)}</p>
            <ProgressBar value={o?.collection_rate ?? 0} className="mt-3 h-2" />
            {finance && (
              <p className="mt-3 text-[13px] text-muted">
                Авлага <span className="num font-semibold text-ink">{(finance.total_outstanding / 1_000_000).toFixed(1)} сая₮</span>
              </p>
            )}
            <Link to="/finance/reports" className="mt-4 inline-block text-[13px] font-medium text-accent hover:underline">Санхүүгийн тайлан</Link>
          </Panel>
          <Panel title="Голч дүнгээр тэргүүлэх">
            {schools ? (
              <ol className="flex flex-col gap-2.5">
                {[...schools].filter((s) => s.students).sort((a, b) => b.avg_gpa - a.avg_gpa).slice(0, 4).map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3 text-[13px]">
                    <span className="num w-4 text-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{s.name}</span>
                    <span className="num font-semibold">{s.avg_gpa.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            ) : <PageLoader />}
          </Panel>
        </div>
      </div>
    </>
  );
}
