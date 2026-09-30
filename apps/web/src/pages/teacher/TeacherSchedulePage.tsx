import { useMemo, useState } from 'react';
import { CalendarDays, CalendarX2 } from 'lucide-react';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, Panel } from '@/components/ui';
import { CancelClassModal } from '@/features/schedules/components/CancelClassModal';
import { TimetableGrid } from '@/features/schedules/components/TimetableGrid';
import { TodaySchedule } from '@/features/schedules/components/WeekSchedule';
import { useSchedules } from '@/features/schedules/hooks';
import { WEEK_DAYS, nextDateOfWeekday, toMin, todayIso } from '@/features/schedules/lib/timetable';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Schedule } from '@/types/models';

/**
 * Багшийн хуваарь.
 * API/mock/supabase гурвуулаа багш рольд ЗӨВХӨН түүний хичээлийн цагийг буцаадаг
 * тул энд тусгай шүүлтүүр шаардлагагүй.
 */
export default function TeacherSchedulePage() {
  useDocumentTitle('Миний хуваарь');
  const { data, isLoading, error, refetch } = useSchedules({ mine: true });
  const rows = data ?? [];
  /** Хуваарь дээрх хичээлийн цаг дээр дарахад гарах "Өнөөдөр хичээл орохгүй" цонх */
  const [cancelTarget, setCancelTarget] = useState<Schedule | null>(null);

  const today = todayIso();
  const cancelledToday = rows.filter((r) => r.cancelled_today);
  const upcomingCancelled = rows
    .flatMap((r) => (r.cancellations ?? []).filter((c) => c.cancel_date > today).map((c) => ({ row: r, ...c })))
    .sort((a, b) => a.cancel_date.localeCompare(b.cancel_date));

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
              <TimetableGrid rows={rows} view="teacher" onEntryClick={setCancelTarget} />
            </div>
            <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-muted">
              Хичээлдээ орох боломжгүй болсон бол хуваарь дээрх тухайн цаг дээр дарж <b>«Өнөөдөр хичээл орохгүй»</b> сонголтыг сонгоно. Оюутнуудад мэдэгдэл автоматаар илгээгдэнэ.
            </p>
          </Panel>
          <div className="flex flex-col gap-6 self-start">
            <Panel title="Өнөөдөр" bodyClassName="px-5 py-1">
              <TodaySchedule rows={rows} show="class" />
            </Panel>
            {cancelledToday.length || upcomingCancelled.length ? (
              <Panel title="Цуцлагдсан хичээл" bodyClassName="px-5 py-3">
                <ul className="flex flex-col gap-2.5 text-[13px]">
                  {cancelledToday.map((r) => (
                    <li key={`t-${r.id}`} className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block font-medium text-ink">{r.subject_name}</span>
                        <span className="num text-xs text-muted">
                          {today} · {r.start_time.slice(0, 5)}
                        </span>
                      </span>
                      <Badge tone="danger">Өнөөдөр</Badge>
                    </li>
                  ))}
                  {upcomingCancelled.map((c) => (
                    <li key={`u-${c.row.id}-${c.cancel_date}`} className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block font-medium text-ink">{c.row.subject_name}</span>
                        <span className="num text-xs text-muted">
                          {c.cancel_date} · {c.row.start_time.slice(0, 5)}
                        </span>
                      </span>
                      <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>
        </div>
      )}

      <CancelClassModal
        session={cancelTarget}
        onClose={() => setCancelTarget(null)}
        date={cancelTarget ? nextDateOfWeekday(cancelTarget.day_of_week) : undefined}
      />
    </>
  );
}
