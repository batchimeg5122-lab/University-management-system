import { cn } from '@/lib/utils';

export function SegmentBar({ segments, className }: {
  segments: { label: string; value: number; color: string }[];
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink/[0.06]">
        {segments.map((s) => (
          <div key={s.label} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-muted">
            <span className={cn('h-2 w-2 rounded-full', s.color)} />
            {s.label}
            <span className="num font-medium text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
