import { Clock } from 'lucide-react';
import { DataTable, ExportButton, PageHeader, Panel, Select, SheetPdfButton, StatStrip } from '@/components/ui';
import { SESSION_KIND_LABEL, type SessionKind, type WorkloadCourseRow } from '@/features/workload/api';
import { WorkloadSheet } from '@/features/workload/components/WorkloadSheet';
import { useWorkload } from '@/features/workload/hooks';
import { useSemesters } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { exportExcel } from '@/lib/excel';
import { useSearchParams } from 'react-router-dom';

const KINDS: SessionKind[] = ['lecture', 'seminar', 'lab', 'exam'];

/**
 * Багшийн хичээлийн цаг (ачаалал).
 * Excel болон гарын үсгийн хүрээтэй A4 PDF тодорхойлолт болгон татна.
 */
export default function MyWorkloadPage() {
  useDocumentTitle('Хичээлийн цаг');
  const [params, setParams] = useSearchParams();
  const semesterId = params.get('semester') ?? '';
  const { data: semesters } = useSemesters();
  const { data, isLoading, error, refetch } = useWorkload(semesterId ? { semester_id: semesterId } : {});
  const t = data?.totals;

  return (
    <>
      <PageHeader
        title="Хичээлийн цаг"
        description="Улирлын ачаалал — хичээл, анги, долоо хоногийн болон улирлын академик цаг. Тэнхим, санхүүд тайлагнахад бэлэн PDF гаргана."
        actions={
          <>
            <ExportButton
              disabled={!data?.rows.length}
              onExport={() =>
                exportExcel(
                  'hicheeliin-tsag',
                  'Хичээлийн цаг',
                  [
                    { header: 'Хичээлийн код', value: (r) => r.subject_code, width: 14 },
                    { header: 'Хичээл', value: (r) => r.subject_name, width: 34 },
                    { header: 'Анги', value: (r) => r.class_name, width: 14 },
                    { header: 'Кредит', value: (r) => r.credit },
                    { header: 'Оюутан', value: (r) => r.student_count },
                    ...KINDS.map((k) => ({ header: SESSION_KIND_LABEL[k], value: (r: WorkloadCourseRow) => r.weekly[k] })),
                    { header: '7 хоногт (цаг)', value: (r) => r.weekly_total, width: 15 },
                    { header: 'Улиралд (цаг)', value: (r) => r.semester_total, width: 15 },
                    { header: 'Цагийн тоо', value: (r) => r.session_count, width: 12 },
                    { header: 'Цуцлагдсан', value: (r) => r.cancelled_count, width: 12 },
                  ],
                  data?.rows ?? [],
                )
              }
            />
            <SheetPdfButton
              variant="primary"
              label="Тодорхойлолт (PDF)"
              disabled={!data}
              fileName={`hicheeliin-tsag-${semesterId || 'current'}`}
              title="Хичээлийн цагийн тодорхойлолт"
              subject={data?.teacher?.name ?? ''}
              sheet={(ref) => (data ? <WorkloadSheet ref={ref} report={data} /> : null)}
            />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          className="sm:w-64"
          value={semesterId}
          onChange={(e) => {
            const v = e.target.value;
            setParams(v ? { semester: v } : {}, { replace: true });
          }}
          placeholder="Одоогийн улирал"
          options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} · ${s.name}` }))}
        />
        {data?.semester && <p className="text-[13px] text-muted">{data.semester.label} · {data.weeks} долоо хоног</p>}
      </div>

      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Долоо хоногт', value: `${t?.weekly_hours ?? 0} цаг`, sub: `${t?.sessions ?? 0} хичээлийн цаг` },
          { label: 'Улиралд', value: `${t?.semester_hours ?? 0} цаг`, sub: `${data?.weeks ?? 0} долоо хоногоор` },
          { label: 'Хичээл / анги', value: `${t?.courses ?? 0} / ${t?.classes ?? 0}`, sub: `${t?.credits ?? 0} кредит` },
          { label: 'Оюутан', value: t?.students ?? 0, sub: t?.cancelled ? `${t.cancelled} цуцлагдсан` : undefined, tone: t?.cancelled ? 'danger' : 'default' },
        ]}
      />

      <Panel flush title="Хичээл тус бүрийн цаг" description={`Нэг хичээлийн цаг = ${data?.academic_minutes ?? 40} минут`}>
        <DataTable
          rows={data?.rows}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.course_id}
          empty={{ icon: Clock, title: 'Энэ улиралд оноогдсон хичээл алга' }}
          columns={[
            {
              key: 'subject',
              header: 'Хичээл',
              cell: (r) => (
                <div>
                  <p className="font-medium">{r.subject_name ?? '—'}</p>
                  <p className="num text-xs text-faint">{r.subject_code ?? ''}</p>
                </div>
              ),
            },
            { key: 'class', header: 'Анги', cell: (r) => r.class_name ?? '—' },
            { key: 'credit', header: 'Кредит', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.credit ?? '—'}</span> },
            { key: 'students', header: 'Оюутан', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.student_count}</span> },
            ...KINDS.map((k) => ({
              key: k,
              header: SESSION_KIND_LABEL[k],
              align: 'right' as const,
              hideOnMobile: true,
              cell: (r: { weekly: Record<SessionKind, number> }) => <span className="num text-muted">{r.weekly[k] || '—'}</span>,
            })),
            { key: 'weekly', header: '7 хоногт', align: 'right', cell: (r) => <span className="num font-semibold">{r.weekly_total}</span> },
            { key: 'semester', header: 'Улиралд', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.semester_total}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
