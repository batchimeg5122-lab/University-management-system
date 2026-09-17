import { useMemo, useState } from 'react';
import { SegmentBar } from '@/components/charts/SegmentBar';
import { DataTable, PageHeader, Panel, ProgressBar, Select, StatStrip } from '@/components/ui';
import { AttendanceBadge } from '@/components/ui/StatusBadge';
import { useMyAttendance } from '@/features/attendance/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ATTENDANCE_LABEL, DAY_LABEL } from '@/lib/constants';
import { formatDate, percent } from '@/lib/utils';
import type { AttendanceStatus } from '@/types/models';

const rateOf = (rows: { status: AttendanceStatus }[]) =>
  rows.length ? (rows.filter((r) => r.status !== 'absent' && r.status !== 'sick').length / rows.length) * 100 : 0;

export default function MyAttendancePage() {
  useDocumentTitle('Ирц');
  const { data, isLoading, error, refetch } = useMyAttendance();
  const [subject, setSubject] = useState('');

  const bySubject = useMemo(() => {
    const map = new Map<string, { name: string; rows: { status: AttendanceStatus }[] }>();
    data?.forEach((a) => {
      const key = a.course_id;
      const row = map.get(key) ?? { name: a.subject_name ?? '', rows: [] };
      row.rows.push(a);
      map.set(key, row);
    });
    return [...map.entries()].map(([id, v]) => ({ id, ...v, rate: rateOf(v.rows) }));
  }, [data]);

  const filtered = data?.filter((a) => !subject || a.course_id === subject);
  const count = (s: AttendanceStatus) => data?.filter((a) => a.status === s).length ?? 0;

  return (
    <>
      <PageHeader title="Миний ирц" description="Хоцорсон, чөлөөтэй бол ирсэнд тооцогдоно. Ирц 80%-иас доош бол багштайгаа холбогдоно уу." />

      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Нийт ирц', value: percent(data ? rateOf(data) : undefined, 1) },
          { label: 'Ирсэн', value: count('present') },
          { label: 'Хоцорсон', value: count('late') },
          { label: 'Тасалсан', value: count('absent'), tone: count('absent') > 3 ? 'danger' : 'default' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Хичээлээр">
            <ul className="flex flex-col gap-4">
              {bySubject.map((s) => (
                <li key={s.id}>
                  <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                    <span className="truncate text-ink-soft">{s.name}</span>
                    <span className="num font-medium">{percent(s.rate)}</span>
                  </div>
                  <ProgressBar value={s.rate} tone={s.rate < 80 ? 'danger' : 'accent'} />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Төлвөөр">
            <SegmentBar
              segments={[
                { label: ATTENDANCE_LABEL.present, value: count('present'), color: 'bg-success' },
                { label: ATTENDANCE_LABEL.late, value: count('late'), color: 'bg-warn' },
                { label: ATTENDANCE_LABEL.excused, value: count('excused'), color: 'bg-faint' },
                { label: ATTENDANCE_LABEL.sick, value: count('sick'), color: 'bg-accent' },
                { label: ATTENDANCE_LABEL.absent, value: count('absent'), color: 'bg-danger' },
              ]}
            />
          </Panel>
        </div>

        <Panel
          flush
          title="Бүртгэл"
          actions={
            <Select
              className="w-56"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Бүх хичээл"
              options={bySubject.map((s) => ({ value: s.id, label: s.name }))}
            />
          }
        >
          <DataTable
            rows={filtered}
            loading={isLoading}
            error={error}
            onRetry={refetch}
            rowKey={(r) => r.id}
            dense
            pageSize={15}
            empty={{ title: 'Ирцийн бүртгэл алга' }}
            columns={[
              { key: 'date', header: 'Огноо', cell: (r) => <span className="num">{formatDate(r.attendance_date)}</span> },
              { key: 'day', header: 'Гараг', hideOnMobile: true, cell: (r) => { const d = new Date(r.attendance_date).getDay(); return <span className="text-muted">{DAY_LABEL[d === 0 ? 7 : d]}</span>; } },
              { key: 'subject', header: 'Хичээл', cell: (r) => r.subject_name },
              { key: 'status', header: 'Төлөв', align: 'right', cell: (r) => <AttendanceBadge status={r.status} /> },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
