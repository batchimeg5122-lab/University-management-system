import { cn, formatNumber } from '@/lib/utils';

export function BarList({ items, format = (v) => formatNumber(v), className, max }: {
  items: { label: string; value: number; hint?: string }[];
  format?: (v: number) => string;
  className?: string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-4 text-[13px]">
            <span className="truncate text-ink-soft">{item.label}</span>
            <span className="num shrink-0 font-medium text-ink">
              {format(item.value)}
              {item.hint && <span className="ml-1.5 font-normal text-faint">{item.hint}</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(item.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
