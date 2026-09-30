import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button, ErrorState, ExportButton, Input, PageLoader, Panel, SearchInput } from '@/components/ui';
import { attendanceApi } from '@/features/attendance/api';
import { useAttendanceDates, useCourseAttendance, useSaveAttendance } from '@/features/attendance/hooks';
import { CourseHeader } from '@/features/courses/components/CourseHeader';
import { useCourseEnrollments } from '@/features/grades/hooks';
import { useSchedules } from '@/features/schedules/hooks';
import { useToast } from '@/components/ui/Toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { exportExcel } from '@/lib/excel';
import { ATTENDANCE_LABEL, DAY_LABEL } from '@/lib/constants';
import { cn, toISODate } from '@/lib/utils';
import type { AttendanceStatus } from '@/types/models';

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'sick', 'excused'];
const ACTIVE: Record<AttendanceStatus, string> = {
  present: 'bg-success text-white border-success',
  late: 'bg-warn text-white border-warn',
  absent: 'bg-danger text-white border-danger',
  sick: 'bg-accent text-white border-accent',
  excused: 'bg-ink-soft text-white border-ink-soft',
};

export default function CourseAttendancePage() {
  const { courseId = '' } = useParams();
  useDocumentTitle('Ирц');
  const toast = useToast();
  const { data: enrollments, isLoading, error } = useCourseEnrollments(courseId);
  const { data: schedules } = useSchedules({ course_id: courseId });
  const { data: dates } = useAttendanceDates(courseId);
  const [date, setDate] = useState(toISODate(new Date()));
  const { data: records, isFetching } = useCourseAttendance(courseId, date);
  const save = useSaveAttendance(courseId);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [q, setQ] = useState('');

  const classDays = useMemo(() => new Set(schedules?.map((s) => s.day_of_week)), [schedules]);
  const dow = (() => { const d = new Date(`${date}T00:00:00`).getDay(); return d === 0 ? 7 : d; })();

  useEffect(() => {
    if (!records) return;
    setMarks(Object.fromEntries(records.map((r) => [r.student_id, r.status])));
  }, [records]);

  const saved = useMemo(() => Object.fromEntries((records ?? []).map((r) => [r.student_id, r.status])), [records]);
  const dirty = Object.keys(marks).some((k) => marks[k] !== saved[k]);
  const rows = enrollments?.filter((e) => !q || (e.student_name ?? '').toLowerCase().includes(q.toLowerCase()) || (e.student_code ?? '').toLowerCase().includes(q.toLowerCase()));
  const unmarked = enrollments?.filter((e) => !marks[e.student_id]).length ?? 0;
  const counts = STATUSES.map((s) => ({ s, n: Object.values(marks).filter((m) => m === s).length }));

  /**
   * Ирцийн журнал — бүх огнооны ирцийг матриц (оюутан × огноо) болгон Excel-д гаргана.
   * Товч дарах үед бүх бичлэгийг сервэрээс татна.
   */
  const exportJournal = async () => {
    const all = await attendanceApi.byCourse(courseId);
    const allDates = [...new Set(all.map((r) => r.attendance_date))].sort();
    const byStudent = new Map<string, Record<string, AttendanceStatus>>();
    all.forEach((r) => byStudent.set(r.student_id, { ...(byStudent.get(r.student_id) ?? {}), [r.attendance_date]: r.status }));

    const short = (s: AttendanceStatus | undefined) =>
      s ? ({ present: 'И', late: 'Х', absent: 'Т', sick: 'Ө', excused: 'З' } as Record<AttendanceStatus, string>)[s] : '';

    await exportExcel(
      'irtsiin-jurnal',
      'Ирц',
      [
        { header: 'Оюутны код', value: (e) => e.student_code, width: 14 },
        { header: 'Оюутан', value: (e) => e.student_name, width: 28 },
        ...allDates.map((d) => ({
          header: d.slice(5).replace('-', '.'),
          value: (e: NonNullable<typeof enrollments>[number]) => short(byStudent.get(e.student_id)?.[d]),
          width: 7,
        })),
        { header: 'Ирсэн', value: (e) => Object.values(byStudent.get(e.student_id) ?? {}).filter((s) => s === 'present').length },
        { header: 'Хоцорсон', value: (e) => Object.values(byStudent.get(e.student_id) ?? {}).filter((s) => s === 'late').length },
        { header: 'Тасалсан', value: (e) => Object.values(byStudent.get(e.student_id) ?? {}).filter((s) => s === 'absent').length },
        {
          header: 'Ирцийн хувь',
          value: (e) => {
            const marks = Object.values(byStudent.get(e.student_id) ?? {});
            if (!marks.length) return '';
            const ok = marks.filter((s) => s === 'present' || s === 'late' || s === 'excused' || s === 'sick').length;
            return Math.round((ok / marks.length) * 100);
          },
          width: 12,
        },
      ],
      enrollments ?? [],
    );
  };

  const markAll = () => enrollments && setMarks((m) => ({ ...m, ...Object.fromEntries(enrollments.filter((e) => !m[e.student_id]).map((e) => [e.student_id, 'present' as const])) }));

  const onSave = async () => {
    try {
      const payload = Object.entries(marks).map(([student_id, status]) => ({ student_id, status }));
      await save.mutateAsync({ date, rows: payload });
      toast.success('Ирц хадгалагдлаа');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (error) return <><CourseHeader courseId={courseId} /><ErrorState error={error} /></>;

  return (
    <>
      <CourseHeader courseId={courseId} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input type="date" label="Огноо" value={date} max={toISODate(new Date())} onChange={(e) => setDate(e.target.value)} wrapperClassName="w-44" />
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {dates?.slice(0, 5).map((d) => (
            <button key={d} onClick={() => setDate(d)} className={cn('num h-8 rounded-full border px-3 text-xs', d === date ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:text-ink')}>
              {d.slice(5).replace('-', '.')}
            </button>
          ))}
        </div>
      </div>

      {!classDays.has(dow) && schedules && (
        <p className="mb-4 rounded-field border border-warn/25 bg-warn-soft px-4 py-2.5 text-[13px] text-warn">
          {DAY_LABEL[dow]} гарагт энэ хичээлийн хуваарь байхгүй. Нөхөж орсон хичээл бол үргэлжлүүлэн бүртгэж болно.
        </p>
      )}

      <Panel
        flush
        title={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-normal text-muted">
            {counts.map(({ s, n }) => (
              <span key={s}>
                {ATTENDANCE_LABEL[s]} <span className="num font-semibold text-ink">{n}</span>
              </span>
            ))}
            {unmarked > 0 && <span className="text-warn">Бүртгээгүй {unmarked}</span>}
          </span>
        }
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Оюутан хайх" className="sm:w-52" />
            <ExportButton label="Ирцийн журнал" disabled={!enrollments?.length} onExport={exportJournal} />
            {unmarked > 0 && <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={markAll}>Үлдсэнийг ирсэн</Button>}
          </>
        }
      >
        {isLoading || (isFetching && !records) ? (
          <PageLoader />
        ) : (
          <ul className="divide-y divide-line">
            {rows?.map((e, i) => (
              <li key={e.student_id} className="flex flex-col gap-2 px-5 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="num w-6 text-right text-xs text-faint">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{e.student_name}</p>
                    <p className="text-xs text-faint">{e.student_code}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pl-9 sm:pl-0" role="radiogroup" aria-label={`${e.student_name} ирц`}>
                  {STATUSES.map((s) => {
                    const active = marks[e.student_id] === s;
                    return (
                      <button
                        key={s}
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMarks((m) => ({ ...m, [e.student_id]: s }))}
                        className={cn('h-7 rounded-full border px-2.5 text-xs font-medium transition-colors', active ? ACTIVE[s] : 'border-line bg-white text-muted hover:border-line-strong hover:text-ink')}
                      >
                        {ATTENDANCE_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className={cn('sticky bottom-4 z-20 mt-4 flex items-center justify-between gap-4 rounded-box border border-line bg-white px-4 py-3 shadow-pop transition-opacity', dirty ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <p className="text-[13px] text-muted">Хадгалаагүй өөрчлөлт байна</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setMarks(saved)}>Буцаах</Button>
          <Button size="sm" variant="primary" onClick={onSave} loading={save.isPending}>Ирц хадгалах</Button>
        </div>
      </div>
    </>
  );
}
