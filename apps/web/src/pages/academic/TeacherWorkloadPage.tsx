import { Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { DataTable, ExportButton, PageHeader, Panel, Select, SheetPdfButton, StatStrip } from '@/components/ui';
import { WorkloadSheet } from '@/features/workload/components/WorkloadSheet';
import { useTeacherLoads, useWorkload } from '@/features/workload/hooks';
import { useSemesters } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { exportExcel } from '@/lib/excel';
import { shortName } from '@/lib/utils';

/**
 * Багш нарын хичээлийн цагийн ачаалал (Сургалтын алба, удирдлага).
 * Хүснэгтээс багш сонгоод түүний тодорхойлолтыг PDF болгон татна.
 */
export default function TeacherWorkloadPage() {
  useDocumentTitle('Багшийн ачаалал');
  const [params, setParams] = useSearchParams();
  const semesterId = params.get('semester') ?? '';
  const teacherId = params.get('teacher') ?? '';

  const { data: semesters } = useSemesters();
  const base = semesterId ? { semester_id: semesterId } : {};
  const loads = useTeacherLoads(base);
  const detail = useWorkload({ ...base, teacher_id: teacherId }, !!teacherId);

  const rows = loads.data ?? [];
  const setParam = (key: 'semester' | 'teacher', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const totals = {
    teachers: rows.length,
    weekly: rows.reduce((s, r) => s + r.weekly_hours, 0),
    courses: rows.reduce((s, r) => s + r.courses, 0),
    students: rows.reduce((s, r) => s + r.students, 0),
  };
  const avg = totals.teachers ? Math.round((totals.weekly / totals.teachers) * 10) / 10 : 0;

  return (
    <>
      <PageHeader
        title="Багшийн ачаалал"
        description="Долоо хоногийн академик цаг, хичээл, анги, оюутны тоо. Багш сонгоод хичээлийн цагийн тодорхойлолтыг PDF болгон татна."
        actions={
          <>
            <ExportButton
              disabled={!rows.length}
              onExport={() =>
                exportExcel('bagshiin-achaalal', 'Багшийн ачаалал', [
                  { header: 'Багш', value: (r) => r.teacher_name, width: 30 },
                  { header: 'Хичээл', value: (r) => r.courses },
                  { header: 'Анги', value: (r) => r.classes },
                  { header: 'Оюутан', value: (r) => r.students },
                  { header: 'Кредит', value: (r) => r.credits },
                  { header: '7 хоногт (цаг)', value: (r) => r.weekly_hours, width: 15 },
                ], rows)
              }
            />
            <SheetPdfButton
              variant="primary"
              label="Сонгосон багшийн PDF"
              disabled={!detail.data}
              fileName={`bagsh-hicheeliin-tsag-${teacherId.slice(0, 8) || 'none'}`}
              title="Хичээлийн цагийн тодорхойлолт"
              subject={detail.data?.teacher?.name ?? ''}
              sheet={(ref) => (detail.data ? <WorkloadSheet ref={ref} report={detail.data} /> : null)}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          className="sm:w-64"
          value={semesterId}
          onChange={(e) => setParam('semester', e.target.value)}
          placeholder="Одоогийн улирал"
          options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} · ${s.name}` }))}
        />
        <Select
          className="sm:w-64"
          value={teacherId}
          onChange={(e) => setParam('teacher', e.target.value)}
          placeholder="PDF-д багш сонгох"
          options={rows.map((r) => ({ value: r.teacher_id, label: r.teacher_name ?? '—' }))}
        />
        {teacherId && detail.data && (
          <p className="text-[13px] text-muted">
            {shortName(detail.data.teacher?.name)} · {detail.data.totals.weekly_hours} цаг/7 хоног
          </p>
        )}
      </div>

      <StatStrip
        loading={loads.isLoading}
        className="mb-6"
        items={[
          { label: 'Багш', value: totals.teachers },
          { label: 'Нийт цаг / 7 хоног', value: totals.weekly },
          { label: 'Дундаж ачаалал', value: `${avg} цаг` },
          { label: 'Хичээл / оюутан', value: `${totals.courses} / ${totals.students}` },
        ]}
      />

      <Panel flush title="Багш тус бүрийн ачаалал" description="Долоо хоногийн академик цагаар буурахаар эрэмбэлэв">
        <DataTable
          rows={rows}
          loading={loads.isLoading}
          error={loads.error}
          onRetry={loads.refetch}
          rowKey={(r) => r.teacher_id}
          empty={{ icon: Users, title: 'Хичээл оноогдсон багш алга' }}
          onRowClick={(r) => setParam('teacher', r.teacher_id)}
          columns={[
            { key: 'name', header: 'Багш', cell: (r) => <span className="font-medium">{r.teacher_name ?? '—'}</span> },
            { key: 'courses', header: 'Хичээл', align: 'right', cell: (r) => <span className="num">{r.courses}</span> },
            { key: 'classes', header: 'Анги', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.classes}</span> },
            { key: 'students', header: 'Оюутан', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.students}</span> },
            { key: 'credits', header: 'Кредит', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.credits}</span> },
            { key: 'weekly', header: '7 хоногт', align: 'right', cell: (r) => <span className="num font-semibold">{r.weekly_hours}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
