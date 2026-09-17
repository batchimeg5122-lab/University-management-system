import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  /** Жижиг дэлгэцэнд нуух */
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns, rows, rowKey, loading, error, onRetry, onRowClick, empty, pageSize = 20, className, dense,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  empty?: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode };
  pageSize?: number;
  className?: string;
  dense?: boolean;
}) {
  const [page, setPage] = useState(0);
  const total = rows?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pages - 1) setPage(0);
  }, [pages, page]);

  const visible = useMemo(() => rows?.slice(page * pageSize, (page + 1) * pageSize) ?? [], [rows, page, pageSize]);
  const align = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const cellPad = dense ? 'px-4 py-2' : 'px-4 py-3';

  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-[12.5px] font-medium text-muted',
                    align(c.align),
                    c.hideOnMobile && 'hidden md:table-cell',
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !rows
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={cn(cellPad, c.hideOnMobile && 'hidden md:table-cell')}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((row, i) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn('border-b border-line last:border-0', onRowClick && 'cursor-pointer hover:bg-paper/70')}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn(cellPad, 'align-middle text-ink', align(c.align), c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                        {c.cell(row, page * pageSize + i)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {!loading && rows && rows.length === 0 && (
        <EmptyState title={empty?.title ?? 'Мэдээлэл алга'} description={empty?.description} icon={empty?.icon} action={empty?.action} />
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[13px] text-muted">
          <span className="num">
            {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} / {total}
          </span>
          <div className="flex items-center gap-1">
            <button className="rounded-md p-1.5 hover:bg-paper disabled:opacity-30" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Өмнөх хуудас">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="num px-1">{page + 1} / {pages}</span>
            <button className="rounded-md p-1.5 hover:bg-paper disabled:opacity-30" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Дараагийн хуудас">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
