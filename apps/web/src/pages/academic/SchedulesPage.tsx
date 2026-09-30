import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Plus } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageHeader, PageLoader, Panel, Segmented, Select } from '@/components/ui';
import { useClasses } from '@/features/classes/hooks';
import { useCourses } from '@/features/courses/hooks';
import { useTeachers } from '@/features/employees/hooks';
import { CancelledClassesPanel } from '@/features/schedules/components/CancelledClassesPanel';
import { ScheduleFormModal, type ScheduleDraft } from '@/features/schedules/components/ScheduleFormModal';
import { TimetableGrid, type TimetableView } from '@/features/schedules/components/TimetableGrid';
import { useSchedules } from '@/features/schedules/hooks';
import { CONFLICT_LABEL, findAllConflicts } from '@/features/schedules/lib/timetable';
import { useCurrentSemester, useSemesters } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { DAY_LABEL } from '@/lib/constants';
import { hhmm, shortName } from '@/lib/utils';
import type { Schedule } from '@/types/models';

export default function SchedulesPage() {
  useDocumentTitle('Нэгдсэн хуваарь');
  const { can } = useRole();
  const canEdit = can('schedules');

  const { data: current } = useCurrentSemester();
  const { data: semesters } = useSemesters();
  const [semesterId, setSemesterId] = useState('');
  const activeSemester = semesterId || current?.id || '';

  const [view, setView] = useState<TimetableView>('all');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [room, setRoom] = useState('');

  // Нэгдсэн хуваарийг нэг удаа татаж, харагдацыг клиент талд шүүнэ — давхцал шалгахад бүх өгөгдөл хэрэгтэй
  const { data: all, isLoading, error, refetch } = useSchedules({ semester_id: activeSemester }, !!activeSemester);
  const { data: courses } = useCourses({ semester_id: activeSemester });
  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers();

  const [editing, setEditing] = useState<Schedule | null>(null);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);

  const rows = all ?? [];
  const pairs = useMemo(() => findAllConflicts(rows), [rows]);
  const conflictIds = useMemo(() => new Set(pairs.flatMap((p) => [p.a.id, p.b.id])), [pairs]);

  const rooms = useMemo(
    () => [...new Set(rows.filter((r) => r.room).map((r) => `${r.building ?? ''}|${r.room}`))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [rows],
  );

  const teachersWithCourses = useMemo(() => {
    const ids = new Set((courses ?? []).map((c) => c.teacher_id).filter(Boolean));
    return (teachers ?? []).filter((t) => ids.has(t.id));
  }, [teachers, courses]);

  // Харагдац солиход эхний сонголтыг автоматаар тавина
  useEffect(() => {
    if (view === 'class' && !classId && classes?.length) setClassId(classes[0].id);
    if (view === 'teacher' && !teacherId && teachersWithCourses.length) setTeacherId(teachersWithCourses[0].id);
    if (view === 'room' && !room && rooms.length) setRoom(rooms[0]);
  }, [view, classId, teacherId, room, classes, teachersWithCourses, rooms]);

  const visible = useMemo(() => {
    if (view === 'class') return rows.filter((r) => r.class_id === classId);
    if (view === 'teacher') return rows.filter((r) => r.teacher_id === teacherId);
    if (view === 'room') return rows.filter((r) => `${r.building ?? ''}|${r.room}` === room);
    return rows;
  }, [rows, view, classId, teacherId, room]);

  const formCourses = useMemo(() => {
    const list = courses ?? [];
    if (view === 'class') return list.filter((c) => c.class_id === classId);
    if (view === 'teacher') return list.filter((c) => c.teacher_id === teacherId);
    return list;
  }, [courses, view, classId, teacherId]);

  const unscheduled = useMemo(() => {
    const has = new Set(rows.map((r) => r.course_id));
    return (courses ?? []).filter((c) => !has.has(c.id) && c.status !== 'cancelled');
  }, [rows, courses]);

  const openNew = (d?: ScheduleDraft) => {
    setEditing(null);
    setDraft(d ?? {});
  };

  const entity =
    view === 'class'
      ? (
          <Select className="w-44" value={classId} onChange={(e) => setClassId(e.target.value)} options={(classes ?? []).map((c) => ({ value: c.id, label: `${c.code} анги` }))} />
        )
      : view === 'teacher'
        ? (
            <Select className="w-56" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} options={teachersWithCourses.map((t) => ({ value: t.id, label: t.full_name }))} />
          )
        : view === 'room'
          ? (
              <Select className="w-44" value={room} onChange={(e) => setRoom(e.target.value)} options={rooms.map((r) => { const [b, n] = r.split('|'); return { value: r, label: `${b ? `${b}, ` : ''}${n}` }; })} />
            )
          : null;

  return (
    <>
      <PageHeader
        title="Нэгдсэн хичээлийн хуваарь"
        description="Сургуулийн бүх ангийн хуваарь нэг дор. Нэг багш нэг өрөөнд олон ангид лекц уншиж болно. Давхцлыг систем шалгана."
        actions={
          <>
            <Select className="w-56" value={activeSemester} onChange={(e) => setSemesterId(e.target.value)} options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))} />
            {canEdit && (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openNew({ course_id: unscheduled[0]?.id })} disabled={!courses?.length}>
                Цаг нэмэх
              </Button>
            )}
          </>
        }
      />

      {pairs.length > 0 && (
        <div className="mb-4 rounded-box border border-danger/25 bg-danger-soft px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" />
            {pairs.length} давхцал илэрлээ
          </p>
          <p className="mt-0.5 text-[13px] text-danger/80">Системд өмнө нь орсон өгөгдөл. Хүснэгтэд улаанаар тэмдэглэсэн цагийг дарж зөөнө үү.</p>
          <ul className="mt-2.5 flex flex-col gap-1 text-[13px] text-ink">
            {pairs.slice(0, 5).map((p, i) => (
              <li key={i}>
                <span className="font-medium">{CONFLICT_LABEL[p.kind]}:</span> {DAY_LABEL[p.a.day_of_week]} {hhmm(p.a.start_time)}, {p.a.subject_name} ({p.a.class_name}) ба {p.b.subject_name} ({p.b.class_name})
              </li>
            ))}
          </ul>
        </div>
      )}

      <Panel flush>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'all', label: 'Нэгдсэн' },
              { value: 'class', label: 'Анги' },
              { value: 'teacher', label: 'Багш' },
              { value: 'room', label: 'Өрөө' },
            ]}
          />
          {entity}
          <p className="num text-[13px] text-muted lg:ml-auto">
            {visible.length} цаг
            {view === 'all' && unscheduled.length > 0 && <span className="text-warn">, хуваарьгүй {unscheduled.length} хичээл</span>}
          </p>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !courses?.length ? (
          <EmptyState icon={CalendarDays} title="Энэ улиралд хичээл хуваарилаагүй байна" description="Эхлээд Хичээл хуваарилалт хэсгээс ангид хичээл оноогоод, дараа нь цаг гаргана." />
        ) : (
          <div className="p-2">
            <TimetableGrid
              rows={visible}
              view={view}
              conflictIds={conflictIds}
              onEntryClick={canEdit ? (s) => { setDraft(null); setEditing(s); } : undefined}
              onEmptyClick={canEdit && view !== 'room' ? (day, slot) => openNew({ day_of_week: day, slot, course_id: formCourses[0]?.id }) : undefined}
            />
          </div>
        )}
      </Panel>

      <CancelledClassesPanel />

      {view === 'all' && unscheduled.length > 0 && (
        <Panel className="mt-4" title="Хуваарь гараагүй хичээлүүд" description="Эдгээр хичээлийн цагийг гаргаагүй байна." bodyClassName="px-5 py-3">
          <ul className="flex flex-wrap gap-2">
            {unscheduled.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => openNew({ course_id: c.id })}
                  className="rounded-full border border-line bg-white px-3 py-1 text-[13px] text-ink-soft transition-colors hover:border-accent/40 hover:text-ink disabled:cursor-default"
                >
                  <span className="font-medium text-ink">{c.class_name}</span> {c.subject_name}
                  {c.teacher_name ? `, ${shortName(c.teacher_name)}` : ''}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ScheduleFormModal
        open={!!editing || !!draft}
        onClose={() => {
          setEditing(null);
          setDraft(null);
        }}
        schedule={editing}
        draft={draft ?? undefined}
        courses={editing ? courses ?? [] : draft?.course_id ? courses ?? [] : formCourses}
        semesterSchedules={rows}
        semesterId={activeSemester}
      />
    </>
  );
}
