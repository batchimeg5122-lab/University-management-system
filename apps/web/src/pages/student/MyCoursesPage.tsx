import { useState } from 'react';
import { DataTable, PageHeader, Panel, Select } from '@/components/ui';
import { CourseStatusBadge } from '@/components/ui/StatusBadge';
import { useCourses } from '@/features/courses/hooks';
import { useCurrentSemester, useSemesters } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { SUBJECT_TYPE_LABEL } from '@/lib/constants';
import { shortName } from '@/lib/utils';
import { useSubjects } from '@/features/subjects/hooks';

export default function MyCoursesPage() {
  useDocumentTitle('Хичээл');
  const { data: current } = useCurrentSemester();
  const { data: semesters } = useSemesters();
  const [semesterId, setSemesterId] = useState('');
  const activeSemester = semesterId || current?.id;
  const { data, isLoading, error, refetch } = useCourses({ mine: true, semester_id: activeSemester });
  const { data: subjects } = useSubjects();
  const typeOf = (subjectId: string) => subjects?.find((s) => s.id === subjectId)?.subject_type;
  const totalCredits = data?.reduce((s, c) => s + (c.credit ?? 0), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Миний хичээл"
        description="Сургалтын албанаас танай ангид хуваарилсан хичээлүүд."
        actions={
          <Select
            className="w-60"
            value={activeSemester ?? ''}
            onChange={(e) => setSemesterId(e.target.value)}
            options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))}
          />
        }
      />
      <Panel flush title={`${data?.length ?? 0} хичээл, ${totalCredits} кредит`}>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          empty={{ title: 'Энэ улиралд хичээл хуваарилагдаагүй байна' }}
          columns={[
            { key: 'code', header: 'Код', cell: (r) => <span className="text-muted">{r.subject_code}</span> },
            { key: 'name', header: 'Хичээл', cell: (r) => <span className="font-medium">{r.subject_name}</span> },
            { key: 'type', header: 'Төрөл', hideOnMobile: true, cell: (r) => { const t = typeOf(r.subject_id); return t ? SUBJECT_TYPE_LABEL[t] : '—'; } },
            { key: 'credit', header: 'Кредит', align: 'right', cell: (r) => <span className="num">{r.credit}</span> },
            { key: 'teacher', header: 'Багш', hideOnMobile: true, cell: (r) => shortName(r.teacher_name) },
            { key: 'status', header: 'Төлөв', align: 'right', cell: (r) => <CourseStatusBadge status={r.status} /> },
          ]}
        />
      </Panel>
    </>
  );
}
