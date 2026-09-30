import { useMemo, type ReactNode } from 'react';
import { MapPin, Plus, Video } from 'lucide-react';
import { DAY_LABEL } from '@/lib/constants';
import { cn, shortName } from '@/lib/utils';
import type { Schedule } from '@/types/models';
import { SESSION_TYPE_LABEL, TIME_SLOTS, WEEK_DAYS, hhmm, nextDateOfWeekday, toMin, todayIso, type SessionType } from '../lib/timetable';
import { todayDow } from './WeekSchedule';

export type TimetableView = 'all' | 'class' | 'teacher' | 'room';

/** Стандарт бус цагийг хамгийн ойр цагийн мөрөнд байрлуулна */
function slotIndexFor(start: string) {
  const m = toMin(start);
  const exact = TIME_SLOTS.findIndex((s) => toMin(s.start) === m);
  if (exact >= 0) return exact;
  const inside = TIME_SLOTS.findIndex((s) => m >= toMin(s.start) - 20 && m < toMin(s.end));
  return inside >= 0 ? inside : m < toMin(TIME_SLOTS[0].start) ? 0 : TIME_SLOTS.length - 1;
}

function Entry({ s, view, conflicted, groupClasses, onClick, cancelledOn }: {
  s: Schedule;
  view: TimetableView;
  conflicted: boolean;
  /** Нэгдсэн лекцийн бусад ангиуд */
  groupClasses?: string[];
  onClick?: () => void;
  /** Тухайн гарагийн ойрын хичээл цуцлагдсан огноо (байвал) */
  cancelledOn?: string | null;
}) {
  const offSlot = TIME_SLOTS.every((t) => t.start !== hhmm(s.start_time));
  const type = (s.session_type ?? 'lecture') as SessionType;
  const merged = (groupClasses?.length ?? 0) > 1;
  const lines: ReactNode[] = [];
  if (view !== 'class') {
    lines.push(
      <span key="c" className="font-semibold text-ink">
        {merged ? groupClasses!.join(' + ') : s.class_name}
      </span>,
    );
  }
  if (view !== 'teacher') lines.push(<span key="t">{shortName(s.teacher_name)}</span>);

  const body = (
    <>
      <span className={cn('line-clamp-2 text-[12.5px] font-medium leading-snug', cancelledOn ? 'text-muted line-through' : 'text-ink')}>{s.subject_name}</span>
      <span className="mt-0.5 flex flex-wrap items-center gap-1">
        {cancelledOn && (
          <span className="rounded-[4px] bg-danger-soft px-1.5 py-px text-[10.5px] font-medium text-danger">
            {cancelledOn === todayIso() ? 'Өнөөдөр цуцлагдсан' : `${cancelledOn.slice(5)} цуцлагдсан`}
          </span>
        )}
        {type !== 'lecture' && (
          <span className="rounded-[4px] bg-ink/[0.06] px-1.5 py-px text-[10.5px] font-medium text-ink-soft">{SESSION_TYPE_LABEL[type]}</span>
        )}
        {merged && <span className="rounded-[4px] bg-accent-soft px-1.5 py-px text-[10.5px] font-medium text-accent-ink">Нэгдсэн</span>}
        {s.is_online && (
          <span className="flex items-center gap-0.5 rounded-[4px] bg-gold-soft px-1.5 py-px text-[10.5px] font-medium text-gold">
            <Video className="h-2.5 w-2.5" />
            Онлайн
          </span>
        )}
      </span>
      <span className="mt-1 flex flex-wrap gap-x-2 text-[11.5px] text-muted">{lines}</span>
      {view !== 'room' && s.room && !s.is_online && (
        <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-faint">
          <MapPin className="h-3 w-3 shrink-0" />
          {s.building ? `${s.building}, ` : ''}
          {s.room}
        </span>
      )}
      {offSlot && <span className="num mt-0.5 block text-[11px] text-warn">{hhmm(s.start_time)}–{hhmm(s.end_time)}</span>}
    </>
  );

  const cls = cn(
    'flex w-full flex-col items-start rounded-md border px-2 py-1.5 text-left transition-colors',
    conflicted ? 'border-danger/40 bg-danger-soft' : cancelledOn ? 'border-danger/30 bg-danger-soft/40' : 'border-line bg-white',
    onClick && (conflicted ? 'hover:border-danger' : 'hover:border-accent/50 hover:bg-accent-soft/40'),
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={cls} title={conflicted ? 'Давхцалтай цаг' : cancelledOn ? 'Цуцлалтын дэлгэрэнгүй' : 'Засах'}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * Цаг × гарагийн хүснэгт.
 * view='all' үед нэг нүдэнд олон ангийн хичээл харагдана (сургуулийн нэгдсэн хуваарь).
 */
export function TimetableGrid({
  rows,
  view,
  conflictIds,
  onEntryClick,
  onEmptyClick,
  days = WEEK_DAYS,
}: {
  rows: Schedule[];
  view: TimetableView;
  conflictIds?: Set<string>;
  onEntryClick?: (s: Schedule) => void;
  /** Зөвхөн анги/багш/өрөөний харагдацад хоосон нүдэнд цаг нэмэх */
  onEmptyClick?: (day: number, slotIndex: number) => void;
  days?: number[];
}) {
  const today = todayDow();

  /** Нэгдсэн лекцийн ангиудыг бүлгээр нь цуглуулна */
  const groupClasses = useMemo(() => {
    const map = new Map<string, string[]>();
    rows.forEach((s) => {
      if (!s.group_id) return;
      map.set(s.group_id, [...(map.get(s.group_id) ?? []), s.class_name ?? '']);
    });
    map.forEach((list) => list.sort());
    return map;
  }, [rows]);

  const cells = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    const seenGroups = new Set<string>();
    rows.forEach((s) => {
      // Нэгдсэн лекцийг нэг удаа л харуулна (ангийн харагдацад бүгдийг)
      if (s.group_id && view !== 'class') {
        if (seenGroups.has(s.group_id)) return;
        seenGroups.add(s.group_id);
      }
      const key = `${s.day_of_week}:${slotIndexFor(s.start_time)}`;
      map.set(key, [...(map.get(key) ?? []), s]);
    });
    map.forEach((list) => list.sort((a, b) => (a.class_name ?? '').localeCompare(b.class_name ?? '')));
    return map;
  }, [rows, view]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[84px]" />
          {days.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="border-b border-line px-2 py-2.5" />
            {days.map((d) => (
              <th
                key={d}
                scope="col"
                className={cn('border-b border-l border-line px-2 py-2.5 text-left text-[13px] font-medium', d === today ? 'text-accent-ink' : 'text-ink-soft')}
              >
                {DAY_LABEL[d]}
                {d === today && <span className="ml-1.5 text-xs font-normal text-accent">Өнөөдөр</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((slot, si) => (
            <tr key={slot.index} className={cn(si === 3 && 'border-t-[3px] border-t-paper')}>
              <th scope="row" className="border-b border-line px-2 py-2 text-left align-top">
                <span className="block text-[12.5px] font-medium text-ink">{slot.label}</span>
                <span className="num block text-[11.5px] text-faint">
                  {slot.start}–{slot.end}
                </span>
              </th>
              {days.map((d) => {
                const list = cells.get(`${d}:${si}`) ?? [];
                return (
                  <td key={d} className={cn('group border-b border-l border-line p-1 align-top', d === today && 'bg-accent-soft/25')}>
                    <div className="flex min-h-[64px] flex-col gap-1">
                      {list.map((s) => {
                        const nextDate = nextDateOfWeekday(s.day_of_week);
                        const cancelledOn = (s.cancellations ?? []).find((c) => c.cancel_date === nextDate)?.cancel_date ?? null;
                        return (
                          <Entry
                            key={s.id}
                            s={s}
                            view={view}
                            conflicted={!!conflictIds?.has(s.id)}
                            cancelledOn={cancelledOn}
                            groupClasses={s.group_id ? groupClasses.get(s.group_id) : undefined}
                            onClick={onEntryClick ? () => onEntryClick(s) : undefined}
                          />
                        );
                      })}
                      {onEmptyClick && (view !== 'all' ? list.length === 0 : true) && (
                        <button
                          type="button"
                          onClick={() => onEmptyClick(d, si)}
                          className={cn(
                            'flex flex-1 items-center justify-center rounded-md border border-dashed border-transparent text-faint transition-colors hover:border-accent/40 hover:bg-accent-soft/40 hover:text-accent focus-visible:border-accent/40',
                            list.length ? 'min-h-[24px] opacity-0 group-hover:opacity-100 focus-visible:opacity-100' : 'min-h-[56px]',
                          )}
                          aria-label={`${DAY_LABEL[d]}, ${slot.label}-д цаг нэмэх`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
