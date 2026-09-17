import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { GradeDistributionChart } from '@/components/charts/GradeDistributionChart';
import { SegmentBar } from '@/components/charts/SegmentBar';
import { ErrorState, PageLoader, Panel, StatStrip } from '@/components/ui';
import { CourseHeader } from '@/features/courses/components/CourseHeader';
import { useCourseAttendance } from '@/features/attendance/hooks';
import { useCourseEnrollments, useGradeItems } from '@/features/grades/hooks';
import { useCourseStats } from '@/features/reports/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ATTENDANCE_LABEL } from '@/lib/constants';
import { computeTotal } from '@/lib/gpa';
import { percent } from '@/lib/utils';

export default function CourseStatsPage() {
  const { courseId = '' } = useParams();
  useDocumentTitle('Статистик');
  const { data: stats, isLoading, error, refetch } = useCourseStats(courseId);
  const { data: enrollments } = useCourseEnrollments(courseId);
  const { data: items } = useGradeItems(courseId);
  const { data: attendance } = useCourseAttendance(courseId);

  const atRisk = useMemo(() => {
    if (!enrollments || !attendance) return [];
    return enrollments
      .map((e) => {
        const rows = attendance.filter((a) => a.student_id === e.student_id);
        const ok = rows.filter((a) => a.status !== 'absent' && a.status !== 'sick').length;
        const rate = rows.length ? (ok / rows.length) * 100 : 100;
        const filled = items?.filter((i) => typeof e.scores[i.id] === 'number') ?? [];
        const max = filled.reduce((s, i) => s + i.max_score, 0);
        const progress = max ? (computeTotal(e.scores, items ?? []).total / max) * 100 : null;
        return { ...e, rate, progress };
      })
      .filter((e) => e.rate < 80 || (e.progress !== null && e.progress < 60))
      .sort((a, b) => a.rate - b.rate);
  }, [enrollments, attendance, items]);

  const s = stats?.attendance_by_status ?? {};

  return (
    <>
      <CourseHeader courseId={courseId} />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading || !stats ? (
        <PageLoader />
      ) : (
        <>
          <StatStrip
            className="mb-6"
            items={[
              { label: 'Оюутан', value: stats.student_count },
              { label: 'Дундаж ирц', value: percent(stats.avg_attendance, 1), tone: stats.avg_attendance < 80 ? 'danger' : 'default' },
              { label: stats.graded_count ? 'Дундаж оноо' : 'Дундаж явцын оноо', value: stats.avg_score.toFixed(1) },
              { label: 'Дүн гарсан', value: `${stats.graded_count} / ${stats.student_count}` },
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Үнэлгээний тархалт" description={stats.graded_count ? undefined : 'Дүн бүрэн оруулсны дараа тархалт гарна.'}>
              <GradeDistributionChart distribution={stats.distribution} />
            </Panel>
            <Panel title="Ирцийн төлөв" description="Улирлын эхнээс хойш бүртгэгдсэн бүх хичээлээр">
              <SegmentBar
                className="mt-2"
                segments={[
                  { label: ATTENDANCE_LABEL.present, value: s.present ?? 0, color: 'bg-success' },
                  { label: ATTENDANCE_LABEL.late, value: s.late ?? 0, color: 'bg-warn' },
                  { label: ATTENDANCE_LABEL.excused, value: s.excused ?? 0, color: 'bg-faint' },
                  { label: ATTENDANCE_LABEL.sick, value: s.sick ?? 0, color: 'bg-accent' },
                  { label: ATTENDANCE_LABEL.absent, value: s.absent ?? 0, color: 'bg-danger' },
                ]}
              />
            </Panel>
          </div>
          <Panel className="mt-6" flush title="Анхаарах оюутнууд" description="Ирц 80%-иас доош эсвэл явцын гүйцэтгэл 60%-иас доош">
            {atRisk.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted">Анхаарах оюутан алга.</p>
            ) : (
              <ul className="divide-y divide-line">
                {atRisk.map((e) => (
                  <li key={e.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{e.student_name}</p>
                      <p className="text-xs text-faint">{e.student_code}</p>
                    </div>
                    <p className="num w-24 text-right text-[13px]">
                      <span className={e.rate < 80 ? 'font-semibold text-danger' : 'text-ink'}>{percent(e.rate)}</span>
                      <span className="block text-xs text-faint">ирц</span>
                    </p>
                    <p className="num w-24 text-right text-[13px]">
                      <span className={e.progress !== null && e.progress < 60 ? 'font-semibold text-danger' : 'text-ink'}>{percent(e.progress)}</span>
                      <span className="block text-xs text-faint">явц</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
