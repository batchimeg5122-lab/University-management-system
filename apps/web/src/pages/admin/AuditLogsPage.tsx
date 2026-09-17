import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Badge, DataTable, PageHeader, Panel, Select } from '@/components/ui';
import { useAuditLogs } from '@/features/audit/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDateTime } from '@/lib/utils';

export const ACTION_LABEL: Record<string, string> = {
  CREATE_USER: 'Хэрэглэгч үүсгэсэн',
  UPDATE_USER: 'Хэрэглэгч засварласан',
  UPDATE_ROLE: 'Эрх өөрчилсөн',
  CREATE_STUDENT: 'Оюутан бүртгэсэн',
  UPDATE_STUDENT: 'Оюутны мэдээлэл засварласан',
  UPDATE_STUDENT_STATUS: 'Оюутны төлөв өөрчилсөн',
  CREATE_EMPLOYEE: 'Ажилтан бүртгэсэн',
  CREATE_DEPARTMENT: 'Бүтцийн нэгж нэмсэн',
  CREATE_PROGRAM: 'Хөтөлбөр нэмсэн',
  CREATE_CLASS: 'Анги нэмсэн',
  CREATE_SUBJECT: 'Хичээл нэмсэн',
  CREATE_COURSE: 'Хичээл хуваарилсан',
  UPDATE_COURSE: 'Хичээл засварласан',
  ASSIGN_TEACHER: 'Багш оноосон',
  CREATE_SCHEDULE: 'Хуваарь нэмсэн',
  UPDATE_SCHEDULE: 'Хуваарь өөрчилсөн',
  DELETE_SCHEDULE: 'Хуваарь устгасан',
  SET_CURRENT_SEMESTER: 'Одоогийн улирал сольсон',
  UPDATE_ATTENDANCE: 'Ирц бүртгэсэн',
  UPDATE_GRADE: 'Дүн оруулсан',
  SUBMIT_GRADE: 'Дүн илгээсэн',
  APPROVE_GRADE: 'Дүн баталгаажуулсан',
  REJECT_GRADE: 'Дүн буцаасан',
  CREATE_INVOICE: 'Нэхэмжлэл үүсгэсэн',
  UPDATE_INVOICE: 'Нэхэмжлэл засварласан',
  RECORD_PAYMENT: 'Төлөлт бүртгэсэн',
  PUBLISH_ANNOUNCEMENT: 'Зарлал нийтэлсэн',
  DELETE_ANNOUNCEMENT: 'Зарлал устгасан',
  RESET_PASSWORD: 'Нууц үг шинэчилсэн',
  CONFIRM_EMAIL: 'Эрх баталгаажуулсан',
  UPDATE_EMPLOYEE: 'Ажилтны мэдээлэл засварласан',
  UPDATE_DEPARTMENT: 'Бүтцийн нэгж засварласан',
  ADD_ENROLLMENT: 'Хичээлд оюутан нэмсэн',
};

const TABLES = ['users', 'students', 'employees', 'courses', 'schedules', 'attendance', 'enrollments', 'invoices', 'payments', 'notifications'];

export default function AuditLogsPage() {
  useDocumentTitle('Үйлдлийн түүх');
  const [filters, setFilters] = useState({ action: '', table: '' });
  const { data, isLoading, error, refetch } = useAuditLogs(filters);

  return (
    <>
      <PageHeader title="Үйлдлийн түүх" description="Дүн, төлбөр, эрх зэрэг чухал өөрчлөлт хэн, хэзээ хийснийг бүртгэнэ." />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row">
          <Select className="sm:w-60" value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} placeholder="Бүх үйлдэл" options={Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))} />
          <Select className="sm:w-48" value={filters.table} onChange={(e) => setFilters((f) => ({ ...f, table: e.target.value }))} placeholder="Бүх хүснэгт" options={TABLES.map((t) => ({ value: t, label: t }))} />
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          pageSize={25}
          empty={{ icon: ScrollText, title: 'Бүртгэл олдсонгүй' }}
          columns={[
            { key: 'time', header: 'Хугацаа', cell: (r) => <span className="num whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</span> },
            { key: 'user', header: 'Хэрэглэгч', cell: (r) => <span className="font-medium">{r.user_name ?? 'Систем'}</span> },
            { key: 'action', header: 'Үйлдэл', cell: (r) => ACTION_LABEL[r.action] ?? r.action },
            { key: 'table', header: 'Хүснэгт', hideOnMobile: true, cell: (r) => r.table_name && <Badge>{r.table_name}</Badge> },
            { key: 'ip', header: 'IP хаяг', align: 'right', hideOnMobile: true, cell: (r) => <span className="num text-faint">{r.ip_address}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
