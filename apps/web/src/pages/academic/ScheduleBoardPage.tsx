import { useMemo, useState, type DragEvent } from 'react';
import { GripVertical, Sparkles, Wand2 } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, Modal, PageHeader, PageLoader, Panel, ProgressBar, Segmented, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClasses } from '@/features/classes/hooks';
import { useCourses } from '@/features/courses/hooks';
import { useTeachers } from '@/features/employees/hooks';
import { useRooms } from '@/features/rooms/hooks';
import { schedulesApi } from '@/features/schedules/api';
import { ScheduleFormModal, type ScheduleDraft } from '@/features/schedules/components/ScheduleFormModal';
import { useSchedules, useUpdateSchedule } from '@/features/schedules/hooks';
import { autoPlace, type Placement } from '@/features/schedules/lib/autoplace';
import { conflictMessage, findConflicts, TIME_SLOTS, WEEK_DAYS } from '@/features/schedules/lib/timetable';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { DAY_LABEL } from '@/lib/constants';
import { cn, hhmm, shortName } from '@/lib/utils';
import type { Course, Schedule } from '@/types/models';

type View = 'class' | 'teacher' | 'room';
type Dragged = { kind: 'entry'; id: string } | { kind: 'course'; id: string };

/** Хуваарийн самбар: чирж шилжүүлэх, хуваарьгүй хичээлийг чирж нэмэх, автомат байршуулалт */
export default function ScheduleBoardPage() {
  useDocumentTitle('Хуваарийн самбар');
  const toast = useToast();
  const qc = useQueryClient();
  const { data: semester } = useCurrentSemester();
  const semesterId = semester?.id ?? '';
  const { data: all, isLoading, error, refetch } = useSchedules({ semester_id: semesterId }, !!semesterId);
  const { data: courses } = useCourses({ semester_id: semesterId });
  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers();
  const { data: rooms } = useRooms();
  const update = useUpdateSchedule();

  const [view, setView] = useState<View>('class');
  const [target, setTarget] = useState('');
  const [dragged, setDragged] = useState<Dragged | null>(null);
  const [hoverCell, setHoverCell] = useState<{ day: number; slot: number; ok: boolean; msg?: string } | null>(null);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [auto, setAuto] = useState<ReturnType<typeof autoPlace> | null>(null);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);

  const targets = useMemo(() => {
    if (view === 'class') return (classes ?? []).map((c) => ({ value: c.id, label: c.code }));
    if (view === 'teacher') return (teachers ?? []).map((t) => ({ value: t.id, label: t.full_name }));
    const set = new Map<string, string>();
    (rooms ?? []).filter((r) => r.is_active).forEach((r) => set.set(`${r.building}|${r.code}`, `${r.building} · ${r.code} (${r.capacity})`));
    return [...set.entries()].map(([value, label]) => ({ value, label }));
  }, [view, classes, teachers, rooms]);
  const activeTarget = target || targets[0]?.value || '';

  const match = (s: Pick<Schedule, 'class_id' | 'teacher_id' | 'room' | 'building'>) => {
    if (view === 'class') return s.class_id === activeTarget;
    if (view === 'teacher') return s.teacher_id === activeTarget;
    const [b, r] = activeTarget.split('|');
    return (s.building ?? '') === b && s.room === r;
  };

  const entries = (all ?? []).filter(match);
  const scheduledCourses = new Set((all ?? []).map((s) => s.course_id));
  const unscheduled = (courses ?? []).filter((c) => !scheduledCourses.has(c.id) && (view === 'room' || match({ class_id: c.class_id, teacher_id: c.teacher_id, room: null, building: null })));

  const cellEntries = (day: number, slotIdx: number) => {
    const slot = TIME_SLOTS[slotIdx];
    return entries.filter((e) => e.day_of_week === day && hhmm(e.start_time) < slot.end && hhmm(e.end_time) > slot.start);
  };

  /** Шилжүүлэхэд давхцах эсэх */
  const check = (day: number, slotIdx: number): { ok: boolean; msg?: string } => {
    if (!dragged) return { ok: false };
    const slot = TIME_SLOTS[slotIdx];
    if (dragged.kind === 'course') {
      const c = courses?.find((x) => x.id === dragged.id);
      if (!c) return { ok: false };
      const hit = findConflicts({ course_id: c.id, class_id: c.class_id, teacher_id: c.teacher_id, day_of_week: day, start_time: slot.start, end_time: slot.end, room: null, building: null }, all ?? [])[0];
      return hit ? { ok: false, msg: conflictMessage(hit.kind, hit.with) } : { ok: true };
    }
    const e = all?.find((x) => x.id === dragged.id);
    if (!e) return { ok: false };
    const others = (all ?? []).filter((x) => x.id !== e.id && (!e.group_id || x.group_id !== e.group_id));
    const hit = findConflicts({ ...e, day_of_week: day, start_time: slot.start, end_time: slot.end }, others)[0];
    return hit ? { ok: false, msg: conflictMessage(hit.kind, hit.with) } : { ok: true };
  };

  const onDrop = async (ev: DragEvent, day: number, slotIdx: number) => {
    ev.preventDefault();
    const d = dragged;
    setDragged(null);
    setHoverCell(null);
    if (!d) return;
    const res = check(day, slotIdx);
    if (!res.ok) return toast.error(res.msg ?? 'Энэ цагт байршуулах боломжгүй');
    const slot = TIME_SLOTS[slotIdx];
    if (d.kind === 'course') return setDraft({ course_id: d.id, day_of_week: day, slot: slot.index });
    const e = all?.find((x) => x.id === d.id);
    if (!e || (e.day_of_week === day && hhmm(e.start_time) === slot.start)) return;
    try {
      await update.mutateAsync({ id: e.id, day_of_week: day, start_time: slot.start, end_time: slot.end });
      toast.success(`${e.subject_name}: ${DAY_LABEL[day]} ${slot.start} руу шилжлээ. Оюутнуудад мэдэгдэл очно.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const runAuto = () => setAuto(autoPlace(courses ?? [], all ?? [], rooms ?? []));

  const saveAuto = async () => {
    if (!auto) return;
    setSaving({ done: 0, total: auto.placed.length });
    let ok = 0;
    const failed: string[] = [];
    for (const [i, p] of auto.placed.entries()) {
      try {
        await schedulesApi.create({ course_ids: [p.course.id], day_of_week: p.day_of_week, start_time: p.start_time, end_time: p.end_time, room: p.room, building: p.building, session_type: 'lecture', is_online: false });
        ok++;
      } catch (err) {
        failed.push(`${p.course.subject_name}: ${errorMessage(err)}`);
      }
      setSaving({ done: i + 1, total: auto.placed.length });
    }
    qc.invalidateQueries({ queryKey: ['schedules'] });
    setSaving(null);
    setAuto(null);
    if (failed.length) toast.error(`${ok} хадгалагдаж, ${failed.length} алдаа гарлаа: ${failed[0]}`);
    else toast.success(`${ok} хичээлийг хуваарьт байршууллаа`);
  };

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Хуваарийн самбар"
        description="Хичээлийг чирж өөр цаг руу шилжүүлнэ. Давхцалтай нүд улаанаар гарна. Хуваарьгүй хичээлийг баруун талаас чирж нэмнэ."
        actions={
          <Button variant="primary" icon={<Wand2 className="h-4 w-4" />} disabled={!courses?.some((c) => !scheduledCourses.has(c.id))} onClick={runAuto}>
            Автомат байршуулах
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <Panel
          flush
          title={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Segmented value={view} onChange={(v) => { setView(v); setTarget(''); }} options={[{ value: 'class', label: 'Анги' }, { value: 'teacher', label: 'Багш' }, { value: 'room', label: 'Өрөө' }]} />
              <Select className="sm:w-64" value={activeTarget} onChange={(e) => setTarget(e.target.value)} options={targets} />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="w-20 border-b border-line bg-paper px-2 py-2 text-left font-medium text-muted">Цаг</th>
                  {WEEK_DAYS.map((d) => (
                    <th key={d} className="border-b border-l border-line bg-paper px-2 py-2 font-medium text-muted">{DAY_LABEL[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, si) => (
                  <tr key={slot.index}>
                    <td className="border-b border-line px-2 py-2 align-top">
                      <p className="font-medium">{slot.label}</p>
                      <p className="num text-faint">{slot.start}–{slot.end}</p>
                    </td>
                    {WEEK_DAYS.map((day) => {
                      const items = cellEntries(day, si);
                      const hover = hoverCell?.day === day && hoverCell.slot === si;
                      return (
                        <td
                          key={day}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!hover) setHoverCell({ day, slot: si, ...check(day, si) });
                          }}
                          onDragLeave={() => setHoverCell((h) => (h?.day === day && h.slot === si ? null : h))}
                          onDrop={(e) => void onDrop(e, day, si)}
                          title={hover && !hoverCell?.ok ? hoverCell?.msg : undefined}
                          className={cn('h-[84px] border-b border-l border-line p-1 align-top transition-colors', hover && (hoverCell?.ok ? 'bg-success-soft' : 'bg-danger-soft'))}
                        >
                          {items.map((e) => (
                            <div
                              key={e.id}
                              draggable
                              onDragStart={(ev) => {
                                ev.dataTransfer.effectAllowed = 'move';
                                setDragged({ kind: 'entry', id: e.id });
                              }}
                              onDragEnd={() => { setDragged(null); setHoverCell(null); }}
                              className={cn('mb-1 cursor-grab rounded-md border px-1.5 py-1 active:cursor-grabbing', e.session_type === 'lab' ? 'border-gold/40 bg-gold-soft' : 'border-accent/30 bg-accent-soft')}
                            >
                              <p className="truncate font-semibold text-ink">{e.subject_name}</p>
                              <p className="truncate text-muted">
                                {view !== 'class' && `${e.class_name ?? ''} · `}
                                {view !== 'teacher' && `${shortName(e.teacher_name) ?? ''} · `}
                                {e.is_online ? 'Онлайн' : view !== 'room' ? e.room : ''}
                              </p>
                              {e.group_id && <Badge tone="gold" className="mt-0.5">Нэгдсэн</Badge>}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Хуваарьгүй хичээл" description={`${unscheduled.length} хичээл · нүд рүү чирнэ`}>
          {!unscheduled.length ? (
            <EmptyState icon={Sparkles} title="Бүх хичээл хуваарьтай" />
          ) : (
            <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
              {unscheduled.map((c: Course) => (
                <li
                  key={c.id}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.effectAllowed = 'copy';
                    setDragged({ kind: 'course', id: c.id });
                  }}
                  onDragEnd={() => { setDragged(null); setHoverCell(null); }}
                  className="flex cursor-grab items-start gap-2 rounded-field border border-line bg-white px-2.5 py-2 text-[13px] hover:border-accent"
                >
                  <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.subject_name}</p>
                    <p className="truncate text-[12px] text-muted">{c.class_name} · {shortName(c.teacher_name) ?? 'багшгүй'} · {c.student_count ?? 0} оюутан</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ScheduleFormModal
        open={!!draft}
        onClose={() => setDraft(null)}
        draft={draft ?? undefined}
        courses={courses ?? []}
        semesterSchedules={all ?? []}
        semesterId={semesterId}
      />

      <Modal
        open={!!auto}
        onClose={() => !saving && setAuto(null)}
        size="lg"
        title="Автомат байршуулалтын санал"
        description="Анги, багш, өрөөний давхцалгүй, ангид өдөрт 3-аас ихгүй цагаар тараасан. Шалгаад хадгална."
        footer={
          <>
            <Button variant="ghost" disabled={!!saving} onClick={() => setAuto(null)}>Болих</Button>
            <Button variant="primary" disabled={!auto?.placed.length} loading={!!saving} onClick={() => void saveAuto()}>{auto?.placed.length ?? 0} хуваарь хадгалах</Button>
          </>
        }
      >
        {saving && <ProgressBar className="mb-3" value={(saving.done / Math.max(1, saving.total)) * 100} />}
        <div className="max-h-[50vh] overflow-auto rounded-field border border-line">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-paper text-left text-muted">
              <tr><th className="px-3 py-2">Хичээл</th><th className="px-3 py-2">Цаг</th><th className="px-3 py-2">Өрөө</th></tr>
            </thead>
            <tbody>
              {auto?.placed.map((p: Placement) => (
                <tr key={p.course.id} className="border-t border-line">
                  <td className="px-3 py-1.5"><p className="font-medium">{p.course.subject_name}</p><p className="text-[12px] text-muted">{p.course.class_name} · {shortName(p.course.teacher_name)}</p></td>
                  <td className="num px-3 py-1.5">{DAY_LABEL[p.day_of_week]} {p.start_time}</td>
                  <td className="px-3 py-1.5">{p.building} {p.room}</td>
                </tr>
              ))}
              {auto?.unplaced.map((u) => (
                <tr key={u.course.id} className="border-t border-line bg-danger-soft/40">
                  <td className="px-3 py-1.5">{u.course.subject_name} <span className="text-[12px] text-muted">{u.course.class_name}</span></td>
                  <td colSpan={2} className="px-3 py-1.5 text-danger">{u.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
