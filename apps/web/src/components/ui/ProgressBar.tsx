import { cn } from '@/lib/utils';

export function ProgressBar({ value, max = 100, tone = 'accent', className }: {
  value: number;
  max?: number;
  tone?: 'accent' | 'success' | 'warn' | 'danger';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const color = { accent: 'bg-accent', success: 'bg-success', warn: 'bg-warn', danger: 'bg-danger' }[tone];
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
