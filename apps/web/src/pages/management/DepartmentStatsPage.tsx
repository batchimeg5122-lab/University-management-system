import { useSearchParams } from 'react-router-dom';
import { DataTable, ExportButton, PageHeader, Panel, Select } from '@/components/ui';
import { useDepartments } from '@/features/departments/hooks';
import { useDepartmentReports } from '@/features/reports/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { exportExcel } from '@/lib/excel';
import { percent } from '@/lib/utils';

export default function DepartmentStatsPage() {
  useDocumentTitle('Тэнхимүүд');
  const [params, setParams] = useSearchParams();
  const school = params.get('school') ?? '';
  const { data: schools } = useDepartments({ level: 'school' });
  const { data, isLoading, error, refetch } = useDepartmentReports(school || undefined);

  return (
    <>
      <PageHeader
        title="Тэнхимүүдийн статистик"
        back={school ? { to: '/management/schools', label: 'Сургуулиуд' } : undefined}
        actions={
          <>
            <ExportButton
              disabled={!data?.length}
              onExport={() =>
                exportExcel('tenhimiin-statistik', 'Тэнхим', [
                  { header: 'Тэнхим', value: (r) => r.name, width: 34 },
                  { header: 'Оюутан', value: (r) => r.students },
                  { header: 'Багш', value: (r) => r.teachers },
                  { header: 'Хичээл', value: (r) => r.subjects },
                  { header: 'Анги', value: (r) => r.classes },
                  { header: 'Голч дүн', value: (r) => (r.students ? Number(r.avg_gpa.toFixed(2)) : ''), width: 12 },
                  { header: 'Ирц (%)', value: (r) => (r.students ? Number(r.avg_attendance.toFixed(1)) : ''), width: 12 },
                ], data ?? [])
              }
            />
            <Select className="w-72" value={school} onChange={(e) => setParams(e.target.value ? { school: e.target.value } : {})} placeholder="Бүх сургууль" options={(schools ?? []).map((s) => ({ value: s.id, label: s.name }))} />
          </>
        }
      />
      <Panel flush>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          columns={[
            { key: 'name', header: 'Тэнхим', cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'students', header: 'Оюутан', align: 'right', cell: (r) => <span className="num">{r.students}</span> },
            { key: 'teachers', header: 'Багш', align: 'right', cell: (r) => <span className="num">{r.teachers}</span> },
            { key: 'subjects', header: 'Хичээл', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.subjects}</span> },
            { key: 'classes', header: 'Анги', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.classes}</span> },
            { key: 'gpa', header: 'Голч', align: 'right', cell: (r) => <span className="num">{r.students ? r.avg_gpa.toFixed(2) : '—'}</span> },
            { key: 'att', header: 'Ирц', align: 'right', cell: (r) => <span className="num">{r.students ? percent(r.avg_attendance, 1) : '—'}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
