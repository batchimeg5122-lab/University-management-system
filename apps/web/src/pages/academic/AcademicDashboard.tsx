import { Link } from 'react-router-dom';
import { SemesterTimeline } from '@/components/charts/SemesterTimeline';
import { PageHeader, PageLoader, Panel, StatStrip } from '@/components/ui';
import { useCourses } from '@/features/courses/hooks';
import { usePendingGrades } from '@/features/grades/hooks';
import { useOverview } from '@/features/reports/hooks';
import { useSchedules } from '@/features/schedules/hooks';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDateTime, shortName } from '@/lib/utils';

export default function AcademicDashboard() {
  useDocumentTitle('Сургалтын алба');
  const { data: overview, isLoading } = useOverview();
  const { data: pending, isLoading: pendingLoading } = usePendingGrades();
  const { data: semester } = useCurrentSemester();
  const { data: courses } = useCourses({ semester_id: semester?.id });
  const { data: schedules } = useSchedules({ semester_id: semester?.id });

  const scheduled = new Set(schedules?.map((s) => s.course_id));
  const issues = [
    ...(courses ?? []).filter((c) => !c.teacher_id).map((c) => ({ id: `${c.id}-t`, text: `${c.subject_name} (${c.class_name}) хичээлд багш оноогоогүй`, to: '/academic/courses' })),
    ...(courses ?? []).filter((c) => !scheduled.has(c.id)).map((c) => ({ id: `${c.id}-s`, text: `${c.subject_name} (${c.class_name}) хичээлийн хуваарь гараагүй`, to: '/academic/schedules' })),
  ];

  return (
    <>
      <PageHeader title="Сургалтын алба" description="Энэ улирлын сургалтын үйл явцын тойм." />
      <SemesterTimeline className="mb-4" />
      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Суралцаж буй оюутан', value: overview?.total_students ?? 0 },
          { label: 'Багш', value: overview?.total_teachers ?? 0 },
          { label: 'Явагдаж буй хичээл', value: overview?.active_courses ?? 0 },
          { label: 'Хянах дүн', value: pending?.length ?? 0, sub: 'Хичээлээр', tone: pending?.length ? 'danger' : 'default' },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel flush title="Баталгаажуулах дүн" actions={<Link to="/academic/grades" className="text-[13px] font-medium text-accent hover:underline">Бүгд</Link>}>
          {pendingLoading ? (
            <PageLoader />
          ) : !pending?.length ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted">Хянах дүн алга.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((g) => (
                <li key={g.course.id}>
                  <Link to="/academic/grades" className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper/60">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{g.course.subject_name}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{g.course.class_name}, {shortName(g.course.teacher_name)}, {formatDateTime(g.submitted_at)}</p>
                    </div>
                    <span className="num text-sm text-muted">{g.count} оюутан</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel flush title="Анхаарах зүйлс" description="Энэ улирлын хичээл хуваарилалтаас">
          {!issues.length ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted">Бүх хичээл багштай, хуваарьтай байна.</p>
          ) : (
            <ul className="divide-y divide-line">
              {issues.slice(0, 6).map((i) => (
                <li key={i.id}>
                  <Link to={i.to} className="flex items-center gap-3 px-5 py-3.5 text-[13px] text-ink hover:bg-paper/60">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                    {i.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
