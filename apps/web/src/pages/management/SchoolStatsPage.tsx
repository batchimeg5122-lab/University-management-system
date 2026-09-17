import { useNavigate } from 'react-router-dom';
import { DataTable, PageHeader, Panel, ProgressBar } from '@/components/ui';
import { useSchoolReports } from '@/features/reports/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { percent } from '@/lib/utils';

export default function SchoolStatsPage() {
  useDocumentTitle('Сургуулиуд');
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSchoolReports();
  const total = data?.reduce((s, r) => s + r.students, 0) ?? 0;

  return (
    <>
      <PageHeader title="Сургуулиудын статистик" description="Мөр дээр дарж тухайн сургуулийн тэнхимүүдийг харна." />
      <Panel flush>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/management/departments?school=${r.id}`)}
          columns={[
            { key: 'name', header: 'Сургууль', cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'students', header: 'Оюутан', align: 'right', cell: (r) => (
              <div className="flex items-center justify-end gap-3">
                <div className="hidden w-20 sm:block"><ProgressBar value={r.students} max={total} /></div>
                <span className="num w-8">{r.students}</span>
              </div>
            ) },
            { key: 'teachers', header: 'Багш', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.teachers}</span> },
            { key: 'classes', header: 'Анги', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.classes}</span> },
            { key: 'programs', header: 'Хөтөлбөр', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.programs}</span> },
            { key: 'gpa', header: 'Голч', align: 'right', cell: (r) => <span className="num">{r.students ? r.avg_gpa.toFixed(2) : '—'}</span> },
            { key: 'att', header: 'Ирц', align: 'right', cell: (r) => <span className="num">{r.students ? percent(r.avg_attendance, 1) : '—'}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
