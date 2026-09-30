import { useState } from 'react';
import { Monitor, ScrollText, Smartphone } from 'lucide-react';
import { Badge, DataTable, ExportButton, PageHeader, Panel, Select } from '@/components/ui';
import { exportExcel } from '@/lib/excel';
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
  ADD_MATERIAL: 'Хичээлийн материал нэмсэн',
  UPDATE_MATERIAL: 'Материал засварласан',
  DELETE_MATERIAL: 'Материал устгасан',
  UPDATE_EMPLOYEE: 'Ажилтны мэдээлэл засварласан',
  UPDATE_DEPARTMENT: 'Бүтцийн нэгж засварласан',
  ADD_ENROLLMENT: 'Хичээлд оюутан нэмсэн',
  CREATE_MERGED_SCHEDULE: 'Нэгдсэн лекц нэмсэн',
  CREATE_ROOM: 'Өрөө нэмсэн',
  UPDATE_ROOM: 'Өрөө засварласан',
  ISSUE_CERTIFICATE: 'Тодорхойлолт олгосон',
  REVOKE_CERTIFICATE: 'Тодорхойлолт хүчингүй болгосон',
  UPDATE_PROFILE: 'Профайл шинэчилсэн',
  SEND_BROADCAST: 'Мэдэгдэл илгээсэн',
  DELETE_BROADCAST: 'Мэдэгдэл устгасан',
  CREATE_EXAM: 'Шалгалт товлосон',
  UPDATE_EXAM: 'Шалгалт өөрчилсөн',
  DELETE_EXAM: 'Шалгалт цуцалсан',
  BULK_CREATE_INVOICES: 'Нэхэмжлэл бөөнөөр үүсгэсэн',
  SEND_PAYMENT_REMINDER: 'Төлбөрийн сануулга илгээсэн',
  IMPORT_BANK_STATEMENT: 'Банкны хуулга тулгасан',
  CREATE_DISCOUNT_RULE: 'Хөнгөлөлтийн дүрэм нэмсэн',
  UPDATE_DISCOUNT_RULE: 'Хөнгөлөлтийн дүрэм засварласан',
  DELETE_DISCOUNT_RULE: 'Хөнгөлөлтийн дүрэм устгасан',
  CREATE_CALENDAR_EVENT: 'Календарьт үйл явдал нэмсэн',
  UPDATE_CALENDAR_EVENT: 'Календарийн үйл явдал засварласан',
  DELETE_CALENDAR_EVENT: 'Календарийн үйл явдал устгасан',
  NOTIFY_ADVISORS: 'Зөвлөх багшид эрсдэл мэдэгдсэн',
  SEND_WEEKLY_REPORT: 'Долоо хоногийн тайлан илгээсэн',
  UPDATE_SETTINGS: 'Системийн тохиргоо өөрчилсөн',
  CANCEL_CLASS: 'Тухайн өдрийн хичээл цуцалсан',
  RESTORE_CLASS: 'Хичээлийн цуцлалтыг буцаасан',
};

const TABLES = ['system_settings', 'academic_events', 'discount_rules', 'broadcasts', 'exams', 'users', 'students', 'employees', 'courses', 'schedules', 'class_cancellations', 'attendance', 'enrollments', 'invoices', 'payments', 'notifications', 'course_materials'];

export default function AuditLogsPage() {
  useDocumentTitle('Үйлдлийн түүх');
  const [filters, setFilters] = useState({ action: '', table: '', source: '' });
  const { data, isLoading, error, refetch } = useAuditLogs(filters);

  return (
    <>
      <PageHeader
        title="Үйлдлийн түүх"
        description="Дүн, төлбөр, эрх зэрэг чухал өөрчлөлт хэн, хэзээ, аль төхөөрөмжөөс хийснийг бүртгэнэ."
        actions={
          <ExportButton
            disabled={!data?.length}
            onExport={() =>
              exportExcel('audit-log', 'Үйлдлийн түүх', [
                { header: 'Хугацаа', value: (r) => formatDateTime(r.created_at), width: 18 },
                { header: 'Хэрэглэгч', value: (r) => r.user_name ?? 'Систем', width: 26 },
                { header: 'Үйлдэл', value: (r) => ACTION_LABEL[r.action] ?? r.action, width: 30 },
                { header: 'Код', value: (r) => r.action, width: 22 },
                { header: 'Хүснэгт', value: (r) => r.table_name },
                { header: 'Эх сурвалж', value: (r) => (r.source === 'MOBILE' ? 'Mobile' : 'Web') },
                { header: 'IP хаяг', value: (r) => r.ip_address },
              ], data ?? [])
            }
          />
        }
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row">
          <Select className="sm:w-60" value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} placeholder="Бүх үйлдэл" options={Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))} />
          <Select className="sm:w-48" value={filters.table} onChange={(e) => setFilters((f) => ({ ...f, table: e.target.value }))} placeholder="Бүх хүснэгт" options={TABLES.map((t) => ({ value: t, label: t }))} />
          <Select className="sm:w-44" value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))} placeholder="Web + Mobile" options={[{ value: 'WEB', label: 'Зөвхөн Web' }, { value: 'MOBILE', label: 'Зөвхөн Mobile' }]} />
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
            {
              key: 'source',
              header: 'Эх сурвалж',
              hideOnMobile: true,
              cell: (r) =>
                r.source === 'MOBILE' ? (
                  <Badge tone="accent"><Smartphone className="mr-1 inline h-3 w-3" />Mobile</Badge>
                ) : (
                  <Badge><Monitor className="mr-1 inline h-3 w-3" />Web</Badge>
                ),
            },
            { key: 'table', header: 'Хүснэгт', hideOnMobile: true, cell: (r) => r.table_name && <Badge>{r.table_name}</Badge> },
            { key: 'ip', header: 'IP хаяг', align: 'right', hideOnMobile: true, cell: (r) => <span className="num text-faint">{r.ip_address}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
