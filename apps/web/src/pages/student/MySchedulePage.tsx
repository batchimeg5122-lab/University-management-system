import { ErrorState, PageHeader, PageLoader, Panel } from '@/components/ui';
import { WeekSchedule } from '@/features/schedules/components/WeekSchedule';
import { useSchedules } from '@/features/schedules/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function MySchedulePage() {
  useDocumentTitle('Хуваарь');
  const { data, isLoading, error, refetch } = useSchedules({ mine: true });
  return (
    <>
      <PageHeader title="Хичээлийн хуваарь" description="Энэ улиралд танд хуваарилагдсан хичээлүүдийн долоо хоногийн хуваарь." />
      <Panel>
        {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : <WeekSchedule rows={data ?? []} show="teacher" />}
      </Panel>
    </>
  );
}
