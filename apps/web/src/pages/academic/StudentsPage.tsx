import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus } from 'lucide-react';
import { Button, DataTable, PageHeader, Panel, SearchInput, Select } from '@/components/ui';
import { StudentStatusBadge } from '@/components/ui/StatusBadge';
import { useClasses } from '@/features/classes/hooks';
import { StudentFormModal } from '@/features/students/components/StudentFormModal';
import { useStudents } from '@/features/students/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { STUDENT_STATUS_LABEL } from '@/lib/constants';

export default function StudentsPage() {
  useDocumentTitle('Оюутан');
  const navigate = useNavigate();
  const { can } = useRole();
  const [filters, setFilters] = useState({ q: '', class_id: '', status: '' });
  const { data, isLoading, error, refetch } = useStudents(filters);
  const { data: classes } = useClasses();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Оюутан"
        description="Оюутны бүртгэл, анги, суралцах төлөв."
        actions={can('students') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Оюутан бүртгэх</Button>}
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} placeholder="Нэр, код, регистр" />
          <Select className="sm:w-44" value={filters.class_id} onChange={(e) => setFilters((f) => ({ ...f, class_id: e.target.value }))} placeholder="Бүх анги" options={(classes ?? []).map((c) => ({ value: c.id, label: c.code }))} />
          <Select className="sm:w-44" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} placeholder="Бүх төлөв" options={Object.entries(STUDENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
          <p className="num text-[13px] text-muted sm:ml-auto">{data?.length ?? 0} оюутан</p>
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/academic/students/${r.id}`)}
          empty={{ icon: GraduationCap, title: 'Оюутан олдсонгүй', description: 'Хайлтын нөхцөлөө өөрчилж үзнэ үү.' }}
          columns={[
            { key: 'code', header: 'Код', cell: (r) => <span className="num text-muted">{r.student_code}</span> },
            { key: 'name', header: 'Овог нэр', cell: (r) => <span className="font-medium">{r.full_name}</span> },
            { key: 'class', header: 'Анги', cell: (r) => r.class_name },
            { key: 'program', header: 'Хөтөлбөр', hideOnMobile: true, cell: (r) => <span className="text-muted">{r.program_name}</span> },
            { key: 'gpa', header: 'Голч', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.gpa?.toFixed(2) ?? '—'}</span> },
            { key: 'status', header: 'Төлөв', align: 'right', cell: (r) => <StudentStatusBadge status={r.status} /> },
          ]}
        />
      </Panel>
      <StudentFormModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
