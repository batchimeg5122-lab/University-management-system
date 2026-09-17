import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Avatar, Button, DataTable, ErrorState, PageHeader, PageLoader, Panel, Segmented, StatStrip } from '@/components/ui';
import { GradeStatusBadge, InvoiceStatusBadge, StudentStatusBadge } from '@/components/ui/StatusBadge';
import { StudentFormModal } from '@/features/students/components/StudentFormModal';
import { useStudent } from '@/features/students/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { formatDate, formatMoney, formatNumber, percent } from '@/lib/utils';

export default function StudentDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useStudent(id);
  const { can } = useRole();
  const [tab, setTab] = useState<'grades' | 'finance'>('grades');
  const [editing, setEditing] = useState(false);
  useDocumentTitle(data?.student.full_name ?? 'Оюутан');

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const { student, enrollments, invoices, attendance_rate } = data;
  const balance = invoices.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + Math.max(0, i.net_amount - i.paid_amount), 0);

  return (
    <>
      <PageHeader
        back={{ to: '/academic/students', label: 'Оюутан' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={student.full_name} size={40} />
            {student.full_name}
          </span>
        }
        description={`${student.student_code}, ${student.class_name} анги, ${student.program_name}`}
        actions={
          <>
            <StudentStatusBadge status={student.status} />
            {can('students') && <Button icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>Засах</Button>}
          </>
        }
      />

      <StatStrip
        className="mb-6"
        items={[
          { label: 'Голч дүн', value: student.gpa?.toFixed(2) ?? '—' },
          { label: 'Кредит', value: formatNumber(student.earned_credits) },
          { label: 'Ирц', value: percent(attendance_rate, 1), tone: attendance_rate < 80 ? 'danger' : 'default' },
          { label: 'Төлбөрийн үлдэгдэл', value: formatMoney(balance), tone: balance ? 'default' : 'success' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel flush title={<Segmented value={tab} onChange={setTab} options={[{ value: 'grades', label: 'Хичээл, дүн' }, { value: 'finance', label: 'Төлбөр' }]} />}>
          {tab === 'grades' ? (
            <DataTable
              rows={enrollments}
              rowKey={(r) => r.id}
              columns={[
                { key: 'sem', header: 'Улирал', hideOnMobile: true, cell: (r) => <span className="text-muted">{r.semester_name}</span> },
                { key: 'sub', header: 'Хичээл', cell: (r) => <span className="font-medium">{r.subject_name}</span> },
                { key: 'score', header: 'Оноо', align: 'right', cell: (r) => <span className="num">{r.total_score ?? '—'}</span> },
                { key: 'letter', header: 'Үнэлгээ', align: 'center', cell: (r) => r.letter_grade ?? '—' },
                { key: 'status', header: 'Төлөв', align: 'right', cell: (r) => <GradeStatusBadge status={r.grade_status} /> },
              ]}
            />
          ) : (
            <DataTable
              rows={invoices}
              rowKey={(r) => r.id}
              columns={[
                { key: 'no', header: 'Дугаар', cell: (r) => <span className="num text-muted">{r.invoice_number}</span> },
                { key: 'sem', header: 'Улирал', hideOnMobile: true, cell: (r) => r.semester_name },
                { key: 'net', header: 'Төлөх', align: 'right', cell: (r) => <span className="num">{formatMoney(r.net_amount)}</span> },
                { key: 'paid', header: 'Төлсөн', align: 'right', cell: (r) => <span className="num">{formatMoney(r.paid_amount)}</span> },
                { key: 'status', header: 'Төлөв', align: 'right', cell: (r) => <InvoiceStatusBadge status={r.status} /> },
              ]}
            />
          )}
        </Panel>

        <Panel title="Мэдээлэл" bodyClassName="px-5 py-1">
          <dl className="text-[13px]">
            {[
              ['Регистр', student.register_number],
              ['И-мэйл', student.email],
              ['Утас', student.phone],
              ['Тэнхим', student.department_name],
              ['Элссэн он', student.enrollment_year],
              ['Бүртгэл', formatDate(new Date(`${student.enrollment_year ?? 2026}-09-01`))],
            ].map(([k, v]) => (
              <div key={k as string} className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-0">
                <dt className="text-faint">{k}</dt>
                <dd className="break-words text-ink">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <StudentFormModal open={editing} onClose={() => setEditing(false)} student={student} />
    </>
  );
}
