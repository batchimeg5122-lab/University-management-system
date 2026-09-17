import { Link } from 'react-router-dom';
import { PageHeader, PageLoader, Panel, StatStrip } from '@/components/ui';
import { useAuditLogs } from '@/features/audit/hooks';
import { useOverview } from '@/features/reports/hooks';
import { useUsers } from '@/features/users/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROLE_LABEL } from '@/lib/constants';
import { timeAgo } from '@/lib/utils';
import type { UserRole } from '@/types/models';
import { ACTION_LABEL } from './AuditLogsPage';

export default function AdminDashboard() {
  useDocumentTitle('Хяналтын самбар');
  const { data: users, isLoading } = useUsers({});
  const { data: overview } = useOverview();
  const { data: logs } = useAuditLogs();

  const byRole = (users ?? []).reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {});

  return (
    <>
      <PageHeader title="Системийн хяналт" description="Хэрэглэгч, эрх, бүтэц болон системд хийгдсэн үйлдлүүд." />
      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Нийт хэрэглэгч', value: users?.length ?? 0 },
          { label: 'Идэвхгүй, түдгэлзсэн', value: users?.filter((u) => u.status !== 'active').length ?? 0 },
          { label: 'Сургууль', value: overview?.total_schools ?? 0 },
          { label: 'Өнөөдрийн үйлдэл', value: logs?.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length ?? 0 },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Эрхээр" actions={<Link to="/admin/users" className="text-[13px] font-medium text-accent hover:underline">Хэрэглэгч</Link>} bodyClassName="px-5 py-1">
          <dl>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <div key={r} className="flex justify-between border-b border-line py-3 text-sm last:border-0">
                <dt className="text-muted">{ROLE_LABEL[r]}</dt>
                <dd className="num font-semibold">{byRole[r] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel flush title="Сүүлийн үйлдлүүд" actions={<Link to="/admin/audit-logs" className="text-[13px] font-medium text-accent hover:underline">Бүгд</Link>}>
          {!logs ? <PageLoader /> : (
            <ul className="divide-y divide-line">
              {logs.slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center gap-4 px-5 py-3 text-[13px]">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{l.user_name ?? 'Систем'}</span>
                    <span className="text-muted"> {ACTION_LABEL[l.action]?.toLowerCase() ?? l.action}</span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">{timeAgo(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
