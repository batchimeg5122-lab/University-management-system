import { Link } from 'react-router-dom';
import { SemesterTimeline } from '@/components/charts/SemesterTimeline';
import { PageLoader, Panel, StatStrip } from '@/components/ui';
import { useNotifications } from '@/features/notifications/hooks';
import { useStudentSummary } from '@/features/reports/hooks';
import { TodaySchedule } from '@/features/schedules/components/WeekSchedule';
import { useSchedules } from '@/features/schedules/hooks';
import { useMyCourses } from '@/features/courses/hooks';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useSession } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatMoney, formatNumber, percent, shortName, timeAgo } from '@/lib/utils';

export default function StudentDashboard() {
  useDocumentTitle('Нүүр');
  const session = useSession();
  const { data: summary, isLoading } = useStudentSummary();
  const { data: schedules } = useSchedules({ mine: true });
  const { data: semester } = useCurrentSemester();
  const { data: courses, isLoading: coursesLoading } = useMyCourses(semester?.id);
  const { data: notifications } = useNotifications();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Сайн байна уу, {session.user.first_name}</h1>
        <p className="mt-1 text-sm text-muted">
          {session.student?.program_name}, {session.student?.class_name}, {session.student?.student_code}
        </p>
      </div>

      <SemesterTimeline className="mb-4" />

      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Голч дүн', value: summary?.gpa?.toFixed(2) ?? '—', sub: 'Нийт GPA' },
          { label: 'Ирц', value: percent(summary?.attendance_rate, 1), sub: 'Энэ улирал', tone: summary && summary.attendance_rate < 80 ? 'danger' : 'default' },
          { label: 'Кредит', value: formatNumber(summary?.earned_credits), sub: 'Цуглуулсан' },
          { label: 'Төлбөрийн үлдэгдэл', value: formatMoney(summary?.balance), sub: summary?.balance ? 'Төлөх хугацаа 10.15' : 'Төлбөр төлөгдсөн', tone: summary?.balance ? 'default' : 'success' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Өнөөдрийн хичээл" actions={<Link to="/student/schedule" className="text-[13px] font-medium text-accent hover:underline">Долоо хоногийн хуваарь</Link>} bodyClassName="px-5 py-1">
          {schedules ? <TodaySchedule rows={schedules} show="teacher" /> : <PageLoader />}
        </Panel>

        <Panel title="Сүүлийн мэдэгдэл" actions={<Link to="/notifications" className="text-[13px] font-medium text-accent hover:underline">Бүгд</Link>} bodyClassName="px-5 py-1">
          <ul>
            {(notifications ?? []).slice(0, 4).map((n) => (
              <li key={n.id} className="border-b border-line py-3 last:border-0">
                <p className="flex items-start gap-2 text-[13px] text-ink">
                  {n.user_id && !n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  <span className={n.user_id && !n.is_read ? 'font-medium' : ''}>{n.title}</span>
                </p>
                <p className="mt-0.5 text-xs text-faint">{timeAgo(n.created_at)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Энэ улирлын хичээлүүд" className="mt-6" flush actions={<Link to="/student/grades" className="text-[13px] font-medium text-accent hover:underline">Дүн харах</Link>}>
        {coursesLoading ? (
          <PageLoader />
        ) : (
          <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {courses?.map((c, i) => (
              <li key={c.id} className={`px-5 py-4 ${i >= 2 ? 'sm:border-t sm:border-line' : ''} ${i % 2 === 1 ? 'sm:border-l sm:border-line' : ''}`}>
                <p className="text-xs text-faint">{c.subject_code}, {c.credit} кредит</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{c.subject_name}</p>
                <p className="mt-0.5 text-[13px] text-muted">{shortName(c.teacher_name)} багш</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
