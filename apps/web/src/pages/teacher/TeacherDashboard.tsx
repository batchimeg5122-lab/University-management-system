import { Link } from 'react-router-dom';
import { SemesterTimeline } from '@/components/charts/SemesterTimeline';
import { PageLoader, Panel, StatStrip } from '@/components/ui';
import { useMyCourses } from '@/features/courses/hooks';
import { useNotifications } from '@/features/notifications/hooks';
import { TodaySchedule } from '@/features/schedules/components/WeekSchedule';
import { useSchedules } from '@/features/schedules/hooks';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useSession } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { timeAgo } from '@/lib/utils';

export default function TeacherDashboard() {
  useDocumentTitle('Нүүр');
  const session = useSession();
  const { data: semester } = useCurrentSemester();
  const { data: courses, isLoading } = useMyCourses(semester?.id);
  const { data: schedules } = useSchedules({ mine: true });
  const { data: notifications } = useNotifications();

  const students = courses?.reduce((s, c) => s + (c.student_count ?? 0), 0) ?? 0;
  const hours = (schedules?.length ?? 0) * 80;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Сайн байна уу, {session.user.first_name} багш</h1>
        <p className="mt-1 text-sm text-muted">{session.employee?.department_name}, {session.employee?.position}</p>
      </div>

      <SemesterTimeline className="mb-4" />

      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Хичээл', value: courses?.length ?? 0, sub: 'Энэ улирал' },
          { label: 'Оюутан', value: students, sub: 'Бүх ангид' },
          { label: 'Долоо хоногийн цаг', value: `${Math.round(hours / 60)} цаг`, sub: `${schedules?.length ?? 0} удаа` },
          { label: 'Уншаагүй мэдэгдэл', value: notifications?.filter((n) => n.user_id && !n.is_read).length ?? 0 },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Миний хичээлүүд" flush actions={<Link to="/teacher/courses" className="text-[13px] font-medium text-accent hover:underline">Бүгд</Link>}>
          {isLoading ? (
            <PageLoader />
          ) : (
            <ul className="divide-y divide-line">
              {courses?.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{c.subject_name}</p>
                    <p className="mt-0.5 text-[13px] text-muted">{c.class_name}, {c.student_count} оюутан</p>
                  </div>
                  <div className="flex gap-1">
                    <Link to={`/teacher/courses/${c.id}/attendance`} className="rounded-field px-2.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-paper hover:text-ink">Ирц</Link>
                    <Link to={`/teacher/courses/${c.id}/grades`} className="rounded-field px-2.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-paper hover:text-ink">Дүн</Link>
                    <Link to={`/teacher/courses/${c.id}/stats`} className="rounded-field px-2.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-paper hover:text-ink">Статистик</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Өнөөдөр" bodyClassName="px-5 py-1">
            {schedules ? <TodaySchedule rows={schedules} show="class" /> : <PageLoader />}
          </Panel>
          <Panel title="Мэдэгдэл" bodyClassName="px-5 py-1">
            <ul>
              {(notifications ?? []).slice(0, 3).map((n) => (
                <li key={n.id} className="border-b border-line py-3 last:border-0">
                  <p className="text-[13px] text-ink">{n.title}</p>
                  <p className="mt-0.5 text-xs text-faint">{timeAgo(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
