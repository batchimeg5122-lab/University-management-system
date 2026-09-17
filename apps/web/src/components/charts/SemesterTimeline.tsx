import { useCurrentSemester } from '@/features/semesters/hooks';
import { cn, formatDate } from '@/lib/utils';
import { Skeleton } from '../ui/Skeleton';

const TOTAL_WEEKS = 16;
const MILESTONES: Record<number, string> = { 8: 'Явцын шалгалт', 16: 'Улирлын шалгалт' };

/**
 * Одоогийн улирлын 16 долоо хоногийг шугамаар харуулна.
 * Системийн "онцлох" элемент — хэрэглэгч улирлын хаана явааг нэг харцаар мэднэ.
 */
export function SemesterTimeline({ className, today = new Date() }: { className?: string; today?: Date }) {
  const { data: semester, isLoading } = useCurrentSemester();

  if (isLoading) return <Skeleton className={cn('h-[92px] w-full rounded-box', className)} />;
  if (!semester) return null;

  const start = new Date(semester.start_date);
  const end = new Date(semester.end_date);
  const week = Math.min(TOTAL_WEEKS, Math.max(0, Math.floor((today.getTime() - start.getTime()) / (7 * 86400000)) + 1));
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));

  return (
    <div className={cn('rounded-box border border-line bg-white px-5 py-4', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-[15px] font-semibold text-ink">
          {semester.academic_year} оны {semester.name.toLowerCase()}
        </p>
        <p className="num text-[13px] text-muted">
          {week > 0 ? (
            <>
              <span className="font-semibold text-ink">{week}</span>-р долоо хоног, дуусахад {daysLeft} өдөр
            </>
          ) : (
            <>Эхлэх огноо {formatDate(semester.start_date)}</>
          )}
        </p>
      </div>

      <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${TOTAL_WEEKS}, minmax(0, 1fr))` }} aria-label={`${TOTAL_WEEKS} долоо хоногийн ${week}-р долоо хоног`}>
        {Array.from({ length: TOTAL_WEEKS }).map((_, i) => {
          const n = i + 1;
          const isNow = n === week;
          const milestone = MILESTONES[n];
          return (
            <div key={n} className="group relative" title={milestone ? `${n}-р долоо хоног: ${milestone}` : `${n}-р долоо хоног`}>
              <div
                className={cn(
                  'h-2 rounded-[3px]',
                  n < week && 'bg-accent',
                  isNow && 'bg-gold',
                  n > week && (milestone ? 'bg-accent/25' : 'bg-ink/[0.08]'),
                )}
              />
              {isNow && <span className="absolute left-1/2 top-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold" />}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between text-xs text-faint">
        <span className="num">{formatDate(semester.start_date)}</span>
        <span className="hidden sm:inline">8-р долоо хоногт явцын шалгалт</span>
        <span className="num">{formatDate(semester.end_date)}</span>
      </div>
    </div>
  );
}
