import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, PageLoader, Panel } from '@/components/ui';
import { TimetableGrid } from '@/features/schedules/components/TimetableGrid';
import { TodaySchedule } from '@/features/schedules/components/WeekSchedule';
import { useSchedules } from '@/features/schedules/hooks';
import { WEEK_DAYS, toMin } from '@/features/schedules/lib/timetable';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Багшийн хуваарь.
 * API/mock/supabase гурвуулаа багш рольд ЗӨВХӨН түүний хичээлийн цагийг буцаадаг
 * тул энд тусгай шүүлтүүр шаардлагагүй.
 */
export default function TeacherSchedulePage() {
  useDocumentTitle('Миний хуваарь');
  const { data, isLoading, error, refetch } = useSchedules({ mine: true });
  const rows = data ?? [];

  const summary = useMemo(() => {
    const minutes = rows.reduce((s, r) => s + toMin(r.end_time) - toMin(r.start_time), 0);
    return {
      hours: Math.round((minutes / 60) * 10) / 10,
      classes: new Set(rows.map((r) => r.class_id)).size,
      courses: new Set(rows.map((r) => r.course_id)).size,
      days: WEEK_DAYS.filter((d) => rows.some((r) => r.day_of_week === d)).length,
    };
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Миний хичээлийн хуваарь"
        description={
          data
            ? `Танд оноогдсон ${summary.courses} хичээл, ${summary.classes} анги. Долоо хоногт ${rows.length} удаа, нийт ${summary.hours} цаг, ${summary.days} өдөр.`
            : 'Зөвхөн танд оноогдсон хичээлүүдийн цаг харагдана.'
        }
      />

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !rows.length ? (
        <Panel>
          <EmptyState icon={CalendarDays} title="Хуваарь гараагүй байна" description="Сургалтын алба танд оноосон хичээлийн цагийг гаргасны дараа энд харагдана." />
        </Panel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <Panel flush>
            <div className="p-2">
              <TimetableGrid rows={rows} view="teacher" />
            </div>
          </Panel>
          <Panel title="Өнөөдөр" bodyClassName="px-5 py-1" className="self-start">
            <TodaySchedule rows={rows} show="class" />
          </Panel>
        </div>
      )}
    </>
  );
}
