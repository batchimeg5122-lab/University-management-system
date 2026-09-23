import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Monitor, Smartphone } from 'lucide-react';
import { Badge, DataTable, ExportButton, PageHeader, Panel, SearchInput, Segmented } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { get } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/constants';
import { exportExcel } from '@/lib/excel';
import { formatDateTime } from '@/lib/utils';
import type { UserRole } from '@/types/models';

interface Row {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole | null;
  platform: 'web' | 'mobile';
  aal: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Бүх хэрэглэгчийн нэвтрэлтийн түүх (super_admin) */
export default function LoginHistoryPage() {
  useDocumentTitle('Нэвтрэлтийн түүх');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['login-history', 'all'], queryFn: () => get<Row[]>('/admin/login-history', { limit: 500 }), refetchInterval: 30_000 });
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState<'all' | 'web' | 'mobile'>('all');

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data ?? []).filter((r) => (platform === 'all' || r.platform === platform) && (!s || `${r.full_name} ${r.email} ${r.ip_address}`.toLowerCase().includes(s)));
  }, [data, q, platform]);

  return (
    <>
      <PageHeader
        title="Нэвтрэлтийн түүх"
        description="Сүүлийн 500 амжилттай нэвтрэлт. 30 секунд тутамд шинэчлэгдэнэ."
        actions={
          <ExportButton
            disabled={!rows.length}
            onExport={() =>
              exportExcel('login-history', 'Нэвтрэлт', [
                { header: 'Хугацаа', value: (r: Row) => formatDateTime(r.created_at), width: 18 },
                { header: 'Хэрэглэгч', value: (r) => r.full_name, width: 24 },
                { header: 'И-мэйл', value: (r) => r.email, width: 30 },
                { header: 'Эрх', value: (r) => (r.role ? ROLE_LABEL[r.role] : '') },
                { header: 'Платформ', value: (r) => r.platform },
                { header: '2FA', value: (r) => (r.aal === 'aal2' ? 'Тийм' : 'Үгүй') },
                { header: 'IP', value: (r) => r.ip_address },
                { header: 'Төхөөрөмж', value: (r) => r.user_agent, width: 50 },
              ], rows)
            }
          />
        }
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Нэр, и-мэйл, IP" />
          <Segmented value={platform} onChange={setPlatform} options={[{ value: 'all', label: 'Бүгд' }, { value: 'web', label: 'Web' }, { value: 'mobile', label: 'Mobile' }]} />
        </div>
        <DataTable
          rows={rows}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          pageSize={50}
          empty={{ icon: History, title: 'Нэвтрэлтийн түүх алга' }}
          columns={[
            { key: 'time', header: 'Хугацаа', cell: (r) => <span className="num whitespace-nowrap text-muted">{formatDateTime(r.created_at)}</span> },
            { key: 'user', header: 'Хэрэглэгч', cell: (r) => <div><p className="font-medium">{r.full_name}</p><p className="text-[12px] text-muted">{r.email}</p></div> },
            { key: 'role', header: 'Эрх', hideOnMobile: true, cell: (r) => (r.role ? <Badge>{ROLE_LABEL[r.role]}</Badge> : '—') },
            { key: 'pf', header: 'Төхөөрөмж', cell: (r) => <span className="flex items-center gap-1.5">{r.platform === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}<span className="num text-[12px] text-muted">{r.ip_address}</span></span> },
            { key: 'aal', header: '2FA', align: 'right', cell: (r) => (r.aal === 'aal2' ? <Badge tone="success">2FA</Badge> : <Badge>Нууц үг</Badge>) },
          ]}
        />
      </Panel>
    </>
  );
}
