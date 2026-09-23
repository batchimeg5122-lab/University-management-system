import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Users } from 'lucide-react';
import { EmptyState, ErrorState, Modal, PageLoader, ProgressBar, SearchInput, Segmented } from '@/components/ui';
import { useMaterialAccess } from '../hooks';
import { cn, formatDateTime, percent } from '@/lib/utils';

/** Материалыг хэн үзсэн, хэн үзээгүйг харуулна */
export function MaterialAccessModal({ materialId, onClose }: { materialId: string | null; onClose: () => void }) {
  const { data, isLoading, error, refetch } = useMaterialAccess(materialId);
  const [tab, setTab] = useState<'all' | 'yes' | 'no'>('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.students ?? []).filter(
      (s) =>
        (tab === 'all' || (tab === 'yes' ? s.downloaded : !s.downloaded)) &&
        (!needle || [s.student_name, s.student_code].some((v) => v.toLowerCase().includes(needle))),
    );
  }, [data, tab, q]);

  const rate = data?.total_students ? (data.downloaded_count / data.total_students) * 100 : 0;

  return (
    <Modal open={!!materialId} onClose={onClose} title="Материалын хандалт" description={data?.material.title} size="md">
      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="rounded-box border border-line px-5 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[13px] text-muted">Үзсэн оюутан</p>
              <p className="num text-2xl font-semibold tracking-[-0.02em]">
                {data.downloaded_count}
                <span className="text-base font-normal text-muted"> / {data.total_students}</span>
              </p>
            </div>
            <ProgressBar className="mt-3" value={rate} tone={rate >= 70 ? 'success' : rate >= 30 ? 'accent' : 'warn'} />
            <p className="mt-2 num text-xs text-faint">Ангийн {percent(rate)} нь үзсэн байна</p>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'Бүгд', count: data.total_students },
                { value: 'yes', label: 'Үзсэн', count: data.downloaded_count },
                { value: 'no', label: 'Үзээгүй', count: data.total_students - data.downloaded_count },
              ]}
            />
            <SearchInput value={q} onChange={setQ} placeholder="Оюутан хайх" className="sm:ml-auto sm:w-48" />
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto rounded-field border border-line">
            {rows.length === 0 ? (
              <EmptyState icon={Users} title="Оюутан олдсонгүй" />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((s) => (
                  <li key={s.student_id} className="flex items-center gap-3 px-4 py-2.5">
                    {s.downloaded ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <Circle className="h-4 w-4 shrink-0 text-line-strong" />}
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm', s.downloaded ? 'text-ink' : 'text-muted')}>{s.student_name}</p>
                      <p className="num text-xs text-faint">{s.student_code}</p>
                    </div>
                    <p className="num shrink-0 text-right text-xs text-faint">
                      {s.downloaded ? (
                        <>
                          {formatDateTime(s.last_at)}
                          {s.download_count > 1 && <span className="block">{s.download_count} удаа</span>}
                        </>
                      ) : (
                        'Үзээгүй'
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
