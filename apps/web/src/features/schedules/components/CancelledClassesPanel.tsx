import { CalendarX2 } from 'lucide-react';
import { Badge, EmptyState, Panel } from '@/components/ui';
import { DAY_LABEL } from '@/lib/constants';
import { shortName } from '@/lib/utils';
import { useClassCancellations } from '../hooks';
import { todayIso } from '../lib/timetable';

/**
 * Багш нар цуцалсан хичээлүүдийн хяналт (Сургалтын алба).
 * Өнгөрсөн 14 хоног + ирэх 14 хоногийг харуулна.
 */
export function CancelledClassesPanel() {
  const today = todayIso();
  const from = shift(today, -14);
  const to = shift(today, 14);
  const { data } = useClassCancellations({ from, to });
  const rows = data ?? [];

  return (
    <Panel
      className="mt-4"
      title="Цуцлагдсан хичээл"
      description={`${from} – ${to} хооронд багш нар цуцалсан хичээлүүд. Оюутнуудад мэдэгдэл автоматаар илгээгдсэн.`}
      bodyClassName="px-5 py-3"
    >
      {!rows.length ? (
        <EmptyState icon={CalendarX2} title="Цуцлагдсан хичээл алга" description="Энэ хугацаанд багш нар хичээл цуцлаагүй байна." />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13px]">
              <span className="num w-[86px] shrink-0 text-muted">{r.cancel_date}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium text-ink">{r.subject_name ?? '—'}</span>
                <span className="text-muted">
                  {' '}
                  · {r.class_name ?? '—'} · {DAY_LABEL[r.day_of_week ?? 1]} {r.start_time}–{r.end_time}
                </span>
                {r.reason && <span className="block text-xs text-muted">Шалтгаан: {r.reason}</span>}
              </span>
              <span className="text-xs text-muted">{shortName(r.teacher_name)}</span>
              {r.cancel_date === today ? <Badge tone="danger">Өнөөдөр</Badge> : r.cancel_date > today ? <Badge tone="warn">Хойшид</Badge> : <Badge>Өнгөрсөн</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function shift(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, (m ?? 1) - 1, (d ?? 1) + days);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
