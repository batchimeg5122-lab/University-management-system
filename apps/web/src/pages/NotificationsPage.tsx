import { useMemo, useState } from 'react';
import { Bell, BookOpen, CalendarDays, ClipboardCheck, Megaphone, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageHeader, PageLoader, Panel, Segmented } from '@/components/ui';
import { useNotificationActions, useNotifications } from '@/features/notifications/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { NOTIFICATION_TYPE_LABEL } from '@/lib/constants';
import { cn, timeAgo } from '@/lib/utils';
import type { NotificationType } from '@/types/models';

const ICON: Record<NotificationType, LucideIcon> = {
  general: Bell, grade: BookOpen, attendance: ClipboardCheck, schedule: CalendarDays, finance: Wallet, announcement: Megaphone,
};

export default function NotificationsPage() {
  useDocumentTitle('Мэдэгдэл');
  const { data, isLoading, error, refetch } = useNotifications();
  const { markRead, markAllRead } = useNotificationActions();
  const [tab, setTab] = useState<'all' | 'personal' | 'announcements'>('all');

  const rows = useMemo(() => {
    if (!data) return [];
    if (tab === 'personal') return data.filter((n) => n.user_id);
    if (tab === 'announcements') return data.filter((n) => !n.user_id);
    return data;
  }, [data, tab]);
  const unread = data?.filter((n) => n.user_id && !n.is_read).length ?? 0;

  return (
    <>
      <PageHeader
        title="Мэдэгдэл"
        description={unread ? `${unread} уншаагүй мэдэгдэл байна.` : 'Бүх мэдэгдлээ уншсан байна.'}
        actions={unread > 0 && <Button onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>Бүгдийг уншсан болгох</Button>}
      />

      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'Бүгд', count: data?.length },
          { value: 'personal', label: 'Надад', count: data?.filter((n) => n.user_id).length },
          { value: 'announcements', label: 'Зарлал', count: data?.filter((n) => !n.user_id).length },
        ]}
      />

      <Panel flush>
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Bell} title="Мэдэгдэл алга" description="Шинэ дүн, хуваарийн өөрчлөлт, төлбөрийн мэдээлэл энд харагдана." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((n) => {
              const Icon = ICON[n.type];
              const isUnread = !!n.user_id && !n.is_read;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => isUnread && markRead.mutate(n.id)}
                    className={cn('flex w-full gap-4 px-5 py-4 text-left transition-colors', isUnread ? 'bg-accent-soft/35 hover:bg-accent-soft/60' : 'hover:bg-paper/60')}
                  >
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.user_id ? 'bg-paper text-muted' : 'bg-gold-soft text-gold')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <span className={cn('text-sm text-ink', isUnread && 'font-semibold')}>{n.title}</span>
                        <span className="text-xs text-faint">{timeAgo(n.created_at)}</span>
                      </span>
                      <span className="mt-1 block max-w-2xl text-[13px] leading-relaxed text-muted">{n.message}</span>
                      <span className="mt-1.5 block text-xs text-faint">
                        {NOTIFICATION_TYPE_LABEL[n.type]}
                        {n.created_by_name && `, ${n.created_by_name}`}
                      </span>
                    </span>
                    {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Уншаагүй" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
