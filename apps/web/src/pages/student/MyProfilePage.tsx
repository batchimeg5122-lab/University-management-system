import { Avatar, PageHeader, Panel } from '@/components/ui';
import { StudentStatusBadge } from '@/components/ui/StatusBadge';
import { useSession } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function MyProfilePage() {
  useDocumentTitle('Миний мэдээлэл');
  const { user, student } = useSession();
  if (!student) return null;

  const sections: { title: string; rows: [string, string | number | null | undefined][] }[] = [
    {
      title: 'Хувийн мэдээлэл',
      rows: [
        ['Овог', user.last_name],
        ['Нэр', user.first_name],
        ['Регистрийн дугаар', student.register_number],
        ['И-мэйл', user.email],
        ['Утас', user.phone],
      ],
    },
    {
      title: 'Сургалтын мэдээлэл',
      rows: [
        ['Оюутны код', student.student_code],
        ['Тэнхим', student.department_name],
        ['Хөтөлбөр', student.program_name],
        ['Анги', student.class_name],
        ['Элссэн он', student.enrollment_year],
      ],
    },
  ];

  return (
    <>
      <PageHeader title="Миний мэдээлэл" description="Мэдээлэлд алдаа байвал сургалтын албанд хандаж засуулна уу." />
      <Panel className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.full_name} src={user.avatar_url} size={56} />
          <div>
            <p className="text-lg font-semibold text-ink">{user.full_name}</p>
            <p className="text-[13px] text-muted">{student.student_code}</p>
          </div>
          <div className="ml-auto"><StudentStatusBadge status={student.status} /></div>
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((s) => (
          <Panel key={s.title} title={s.title} bodyClassName="px-5 py-1">
            <dl>
              {s.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-b border-line py-3 text-sm last:border-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </div>
    </>
  );
}
