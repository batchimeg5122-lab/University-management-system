import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

export interface StatItem {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'danger' | 'success';
}

/** Карт бүрийг тусад нь биш, нэг хүрээн дотор хуваагчтайгаар харуулна */
export function StatStrip({ items, loading, className }: { items: StatItem[]; loading?: boolean; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 overflow-hidden rounded-box border border-line bg-white lg:grid-cols-4', className)}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            'flex flex-col gap-1 px-5 py-4',
            i % 2 === 1 && 'border-l border-line',
            i >= 2 && 'border-t border-line lg:border-t-0',
            i % 4 !== 0 && 'lg:border-l',
          )}
        >
          <span className="text-[13px] text-muted">{item.label}</span>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <span
              className={cn(
                'num text-2xl font-semibold tracking-[-0.02em]',
                item.tone === 'danger' ? 'text-danger' : item.tone === 'success' ? 'text-success' : 'text-ink',
              )}
            >
              {item.value}
            </span>
          )}
          {item.sub && <span className="text-xs text-faint">{item.sub}</span>}
        </div>
      ))}
    </div>
  );
}
