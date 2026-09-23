import { useQuery } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, Panel, ProgressBar, StatStrip } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { get } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import type { UserRole } from '@/types/models';

interface DeviceStats {
  total_devices: number;
  users_with_device: number;
  active_30d: number;
  by_platform: Record<string, number>;
  by_role: { role: string; users: number; with_device: number }[];
  daily: { date: string; count: number }[];
}

/** Mobile app-ын хэрэглээ: push бүртгэлтэй төхөөрөмж, платформ, эрх бүрийн хамрах хүрээ */
export default function MobileStatsPage() {
  useDocumentTitle('Mobile статистик');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['device-stats'], queryFn: () => get<DeviceStats>('/devices/stats'), refetchInterval: 60_000 });

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const max = Math.max(1, ...(data?.daily ?? []).map((d) => d.count));
  const ios = data?.by_platform.ios ?? 0;
  const android = data?.by_platform.android ?? 0;

  return (
    <>
      <PageHeader title="Mobile статистик" description="Push мэдэгдэл хүлээн авах боломжтой төхөөрөмжүүд. Хэрэглэгч апп-даа нэвтэрмэгц бүртгэгдэнэ." />
      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Бүртгэлтэй төхөөрөмж', value: formatNumber(data?.total_devices) },
          { label: 'Апп ашигладаг хэрэглэгч', value: formatNumber(data?.users_with_device) },
          { label: 'Сүүлийн 30 хоногт идэвхтэй', value: formatNumber(data?.active_30d), tone: 'success' },
          { label: 'iOS / Android', value: `${formatNumber(ios)} / ${formatNumber(android)}` },
        ]}
      />

      {data && data.total_devices === 0 ? (
        <Panel>
          <EmptyState icon={Smartphone} title="Бүртгэлтэй төхөөрөмж алга" description="Push нь development build (eas build) эсвэл iOS Expo Go дээр EAS projectId тохируулсан үед бүртгэгдэнэ. Migration 20260922000000_mobile_push_avatars.sql ажилласан эсэхийг шалгана уу." />
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Эрх бүрийн хамрах хүрээ" description="Идэвхтэй хэрэглэгчдийн хэдэн хувь нь апп суулгасан">
            <ul className="flex flex-col gap-4">
              {(data?.by_role ?? [])
                .filter((r) => r.users > 0)
                .sort((a, b) => b.users - a.users)
                .map((r) => {
                  const pct = r.users ? Math.round((r.with_device / r.users) * 100) : 0;
                  return (
                    <li key={r.role}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium">{ROLE_LABEL[r.role as UserRole] ?? r.role}</span>
                        <span className="num text-muted">
                          {formatNumber(r.with_device)} / {formatNumber(r.users)} · {pct}%
                        </span>
                      </div>
                      <ProgressBar value={pct} tone={pct >= 60 ? 'success' : pct >= 25 ? 'accent' : 'warn'} />
                    </li>
                  );
                })}
            </ul>
          </Panel>

          <Panel title="Шинэ бүртгэл" description="Сүүлийн 14 хоног">
            <div className="flex h-44 items-end gap-1.5">
              {(data?.daily ?? []).map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                  <span className="num text-[10px] text-muted">{d.count || ''}</span>
                  <div className="w-full rounded-t bg-accent/80" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 1 }} />
                  <span className="num text-[10px] text-faint">{d.date.slice(8)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
