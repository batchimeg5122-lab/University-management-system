import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { DAY_LABEL } from '@/lib/constants';
import { cn, hhmm, shortName } from '@/lib/utils';
import type { Schedule } from '@/types/models';

export const todayDow = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

function Block({ s, show, action }: { s: Schedule; show: 'teacher' | 'class' | 'both'; action?: ReactNode }) {
  return (
    <div className="group relative rounded-field border border-line bg-white px-3 py-2.5">
      <p className="num text-xs text-muted">
        {hhmm(s.start_time)}–{hhmm(s.end_time)}
      </p>
      <p className="mt-0.5 text-[13px] font-medium leading-snug text-ink">{s.subject_name}</p>
      <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted">
        {(show === 'teacher' || show === 'both') && <span>{shortName(s.teacher_name)}</span>}
        {(show === 'class' || show === 'both') && <span>{s.class_name}</span>}
        {s.room && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {s.building ? `${s.building}, ` : ''}
            {s.room} тоот
          </span>
        )}
      </div>
      {action && <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">{action}</div>}
    </div>
  );
}

export function WeekSchedule({ rows, show = 'both', renderAction }: {
  rows: Schedule[];
  show?: 'teacher' | 'class' | 'both';
  renderAction?: (s: Schedule) => ReactNode;
}) {
  const hasWeekend = rows.some((r) => r.day_of_week > 5);
  const days = hasWeekend ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  const today = todayDow();

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:gap-2', hasWeekend ? 'lg:grid-cols-6' : 'lg:grid-cols-5')}>
      {days.map((d) => {
        const items = rows.filter((r) => r.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
        const isToday = d === today;
        return (
          <div key={d} className={cn('rounded-box p-2', isToday ? 'bg-accent-soft/60' : 'bg-paper')}>
            <p className={cn('mb-2 flex items-center justify-between px-1 text-[13px] font-medium', isToday ? 'text-accent-ink' : 'text-ink-soft')}>
              {DAY_LABEL[d]}
              {isToday && <span className="text-xs font-normal">Өнөөдөр</span>}
            </p>
            <div className="flex flex-col gap-2">
              {items.length ? (
                items.map((s) => <Block key={s.id} s={s} show={show} action={renderAction?.(s)} />)
              ) : (
                <p className="px-1 py-3 text-xs text-faint">Хичээлгүй</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TodaySchedule({ rows, show = 'teacher' }: { rows: Schedule[]; show?: 'teacher' | 'class' }) {
  const today = todayDow();
  const items = rows.filter((r) => r.day_of_week === today).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

  if (!items.length) return <p className="py-6 text-center text-[13px] text-muted">Өнөөдөр хичээлгүй.</p>;

  return (
    <ol className="flex flex-col">
      {items.map((s) => {
        const done = toMin(s.end_time) < nowMin;
        const live = toMin(s.start_time) <= nowMin && nowMin <= toMin(s.end_time);
        return (
          <li key={s.id} className="flex gap-4 border-b border-line py-3 last:border-0">
            <div className="num w-12 shrink-0 text-right">
              <p className={cn('text-sm font-medium', done ? 'text-faint' : 'text-ink')}>{hhmm(s.start_time)}</p>
              <p className="text-xs text-faint">{hhmm(s.end_time)}</p>
            </div>
            <span className={cn('w-0.5 shrink-0 rounded-full', live ? 'bg-gold' : done ? 'bg-line' : 'bg-accent/40')} />
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', done ? 'text-muted' : 'text-ink')}>
                {s.subject_name}
                {live && <span className="ml-2 text-xs font-normal text-gold">Одоо явагдаж байна</span>}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {show === 'teacher' ? shortName(s.teacher_name) : s.class_name}
                {s.room && `, ${s.building ? `${s.building} ` : ''}${s.room} тоот`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
