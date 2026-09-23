import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, GraduationCap, Plus } from 'lucide-react';
import { Button, DataTable, ExportButton, PageHeader, Panel, SearchInput, Select } from '@/components/ui';
import { StudentStatusBadge } from '@/components/ui/StatusBadge';
import { useClasses } from '@/features/classes/hooks';
import { StudentFormModal } from '@/features/students/components/StudentFormModal';
import { StudentImportModal } from '@/features/students/components/StudentImportModal';
import { useStudents } from '@/features/students/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { STUDENT_STATUS_LABEL } from '@/lib/constants';
import { exportExcel } from '@/lib/excel';

export default function StudentsPage() {
  useDocumentTitle('Оюутан');
  const navigate = useNavigate();
  const { can } = useRole();
  const [filters, setFilters] = useState({ q: '', class_id: '', status: '' });
  const { data, isLoading, error, refetch } = useStudents(filters);
  const { data: classes } = useClasses();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  return (
    <>
      <PageHeader
        title="Оюутан"
        description="Оюутны бүртгэл, анги, суралцах төлөв."
        actions={
          <>
            <ExportButton
              disabled={!data?.length}
              onExport={() =>
                exportExcel('oyutan', 'Оюутан', [
                  { header: 'Оюутны код', value: (r) => r.student_code },
                  { header: 'Овог', value: (r) => r.last_name, width: 18 },
                  { header: 'Нэр', value: (r) => r.first_name, width: 18 },
                  { header: 'Регистр', value: (r) => r.register_number },
                  { header: 'Анги', value: (r) => r.class_name },
                  { header: 'Хөтөлбөр', value: (r) => r.program_name, width: 32 },
                  { header: 'Тэнхим', value: (r) => r.department_name, width: 28 },
                  { header: 'Элссэн он', value: (r) => r.enrollment_year },
                  { header: 'Голч', value: (r) => (r.gpa !== null ? Number(r.gpa.toFixed(2)) : null) },
                  { header: 'Кредит', value: (r) => r.earned_credits },
                  { header: 'Төлөв', value: (r) => STUDENT_STATUS_LABEL[r.status] },
                  { header: 'И-мэйл', value: (r) => r.email, width: 32 },
                  { header: 'Утас', value: (r) => r.phone },
                ], data ?? [])
              }
            />
            {can('students') && (
              <>
                <Button icon={<FileUp className="h-4 w-4" />} onClick={() => setImporting(true)}>Excel импорт</Button>
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Оюутан бүртгэх</Button>
              </>
            )}
          </>
        }
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
      <StudentImportModal open={importing} onClose={() => setImporting(false)} />
    </>
  );
}
