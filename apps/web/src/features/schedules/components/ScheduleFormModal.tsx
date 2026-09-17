import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, Input, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api';
import { DAY_LABEL } from '@/lib/constants';
import { cn, shortName } from '@/lib/utils';
import type { Course, Schedule } from '@/types/models';
import { BUILDINGS, CONFLICT_LABEL, TIME_SLOTS, WEEK_DAYS, conflictMessage, findConflicts, hhmm, overlaps } from '../lib/timetable';
import { useCreateSchedule, useDeleteSchedule, useUpdateSchedule } from '../hooks';

export interface ScheduleDraft {
  course_id?: string;
  day_of_week?: number;
  slot?: number; // TIME_SLOTS index
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Засах хуваарь (байхгүй бол шинэ) */
  schedule?: Schedule | null;
  draft?: ScheduleDraft;
  courses: Course[];
  /** Тухайн улирлын БҮХ хуваарь — давхцлыг бичих явцад шалгана */
  semesterSchedules: Schedule[];
}

export function ScheduleFormModal({ open, onClose, schedule, draft, courses, semesterSchedules }: Props) {
  const toast = useToast();
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const remove = useDeleteSchedule();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ course_id: '', day_of_week: 1, slot: 0, building: BUILDINGS[0], room: '' });

  useEffect(() => {
    if (!open) return;
    if (schedule) {
      const slot = Math.max(0, TIME_SLOTS.findIndex((t) => t.start === hhmm(schedule.start_time)));
      setForm({ course_id: schedule.course_id, day_of_week: schedule.day_of_week, slot, building: schedule.building ?? BUILDINGS[0], room: schedule.room ?? '' });
    } else {
      setForm({ course_id: draft?.course_id ?? courses[0]?.id ?? '', day_of_week: draft?.day_of_week ?? 1, slot: draft?.slot ?? 0, building: BUILDINGS[0], room: '' });
    }
  }, [open, schedule, draft, courses]);

  const course = courses.find((c) => c.id === form.course_id);
  const slot = TIME_SLOTS[form.slot];

  const candidate = useMemo(
    () =>
      course && slot
        ? {
            id: schedule?.id,
            course_id: course.id,
            class_id: course.class_id,
            teacher_id: course.teacher_id,
            day_of_week: form.day_of_week,
            start_time: slot.start,
            end_time: slot.end,
            room: form.room.trim() || null,
            building: form.building || null,
          }
        : null,
    [course, slot, form, schedule?.id],
  );

  const conflicts = useMemo(() => (candidate ? findConflicts(candidate, semesterSchedules) : []), [candidate, semesterSchedules]);

  /** Сонгосон хичээлийн хувьд гараг/цаг бүрт анги эсвэл багш завгүй эсэх */
  const slotBlock = (day: number, index: number) => {
    if (!course) return null;
    const t = TIME_SLOTS[index];
    const [c] = findConflicts({ id: schedule?.id, course_id: course.id, class_id: course.class_id, teacher_id: course.teacher_id, day_of_week: day, start_time: t.start, end_time: t.end, room: null, building: null }, semesterSchedules);
    return c?.kind ?? null;
  };

  /** Энэ цагт аль хэдийн ашиглагдаж буй өрөөнүүд */
  const busyRooms = useMemo(() => {
    if (!slot) return [];
    return semesterSchedules
      .filter((s) => s.id !== schedule?.id && s.room && (s.building ?? '') === form.building && overlaps(s, { day_of_week: form.day_of_week, start_time: slot.start, end_time: slot.end }))
      .map((s) => s.room!)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [semesterSchedules, schedule?.id, form.building, form.day_of_week, slot]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!candidate || conflicts.length) return;
    const body = { course_id: candidate.course_id, day_of_week: candidate.day_of_week, start_time: candidate.start_time, end_time: candidate.end_time, room: candidate.room, building: candidate.building };
    try {
      if (schedule) await update.mutateAsync({ id: schedule.id, ...body });
      else await create.mutateAsync(body);
      toast.success(schedule ? 'Хуваарь шинэчлэгдлээ' : 'Хуваарьт цаг нэмэгдлээ');
      onClose();
    } catch (err) {
      // Өөр ажилтан зэрэг өөрчилсөн бол сервер 409 буцаана
      toast.error(errorMessage(err));
    }
  };

  const courseLabel = (c: Course) => `${c.class_name}, ${c.subject_name}${c.teacher_name ? `, ${shortName(c.teacher_name)}` : ', багшгүй'}`;
  const sortedCourses = [...courses].sort((a, b) => courseLabel(a).localeCompare(courseLabel(b)));
  const pending = create.isPending || update.isPending;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={schedule ? 'Хуваарь засах' : 'Хуваарьт цаг нэмэх'}
        description={schedule ? `${schedule.subject_name}, ${schedule.class_name}` : 'Анги, багш, өрөө давхцвал хадгалах боломжгүй.'}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {schedule ? (
              <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(true)}>
                Устгах
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button onClick={onClose}>Болих</Button>
              <Button variant="primary" type="submit" form="schedule-form" loading={pending} disabled={!candidate || conflicts.length > 0 || !form.room.trim()}>
                {schedule ? 'Хадгалах' : 'Нэмэх'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="schedule-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Хичээл"
            required
            wrapperClassName="sm:col-span-2"
            value={form.course_id}
            onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
            options={sortedCourses.map((c) => ({ value: c.id, label: courseLabel(c) }))}
            hint={course && !course.teacher_id ? 'Багш оноогоогүй тул багшийн давхцлыг шалгах боломжгүй.' : undefined}
          />

          <Select
            label="Гараг"
            value={String(form.day_of_week)}
            onChange={(e) => setForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))}
            options={WEEK_DAYS.map((d) => ({ value: String(d), label: DAY_LABEL[d] }))}
          />

          <Select
            label="Цаг"
            value={String(form.slot)}
            onChange={(e) => setForm((f) => ({ ...f, slot: Number(e.target.value) }))}
            options={TIME_SLOTS.map((t, i) => {
              const block = slotBlock(form.day_of_week, i);
              return { value: String(i), label: `${t.label} ${t.start}–${t.end}${block ? ` (${block === 'class' ? 'анги завгүй' : 'багш завгүй'})` : ''}` };
            })}
          />

          <Select label="Байр" value={form.building} onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))} options={BUILDINGS.map((b) => ({ value: b, label: b }))} />

          <Input
            label="Өрөө"
            required
            placeholder="305"
            value={form.room}
            onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
            hint={busyRooms.length ? `Энэ цагт завгүй: ${busyRooms.join(', ')}` : 'Энэ цагт энэ байрны бүх өрөө сул'}
          />

          {/* Долоо хоногийн сул цагийн зураглал */}
          {course && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[13px] font-medium text-ink-soft">
                {course.teacher_id ? `${course.class_name} анги, ${shortName(course.teacher_name)} багшийн сул цаг` : `${course.class_name} ангийн сул цаг`}
              </p>
              <div className="overflow-x-auto rounded-field border border-line">
                <table className="w-full min-w-[420px] text-center text-[11.5px]">
                  <thead>
                    <tr className="bg-paper text-muted">
                      <th className="px-1 py-1.5 font-medium" />
                      {WEEK_DAYS.map((d) => (
                        <th key={d} className="px-1 py-1.5 font-medium">{DAY_LABEL[d].slice(0, 2)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((t, i) => (
                      <tr key={t.index} className="border-t border-line">
                        <th className="num px-1.5 py-1 text-left font-normal text-faint">{t.start}</th>
                        {WEEK_DAYS.map((d) => {
                          const block = slotBlock(d, i);
                          const selected = d === form.day_of_week && i === form.slot;
                          return (
                            <td key={d} className="p-0.5">
                              <button
                                type="button"
                                disabled={!!block}
                                onClick={() => setForm((f) => ({ ...f, day_of_week: d, slot: i }))}
                                title={block ? CONFLICT_LABEL[block] : `${DAY_LABEL[d]}, ${t.label}`}
                                className={cn(
                                  'h-6 w-full rounded-[4px] transition-colors',
                                  selected ? 'bg-accent text-white' : block ? (block === 'class' ? 'cursor-not-allowed bg-ink/10' : 'cursor-not-allowed bg-warn/20') : 'bg-success-soft hover:bg-success/25',
                                )}
                              >
                                {selected ? '✓' : ''}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-success-soft ring-1 ring-success/20" />Сул</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-ink/10" />Анги завгүй</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-warn/20" />Багш завгүй</span>
              </p>
            </div>
          )}

          <div className="sm:col-span-2" aria-live="polite">
            {conflicts.length > 0 ? (
              <div className="rounded-field border border-danger/25 bg-danger-soft px-3 py-2.5">
                {conflicts.map((c, i) => (
                  <p key={i} className="flex items-start gap-2 text-[13px] text-danger">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {conflictMessage(c.kind, c.with)}
                  </p>
                ))}
              </div>
            ) : candidate && form.room.trim() ? (
              <p className="flex items-center gap-2 rounded-field bg-success-soft px-3 py-2 text-[13px] text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {DAY_LABEL[form.day_of_week]}, {slot?.label}: анги, багш, өрөө давхцахгүй
              </p>
            ) : null}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title="Хуваарь устгах уу?"
        confirmLabel="Устгах"
        loading={remove.isPending}
        description={schedule && `${schedule.subject_name} (${schedule.class_name}), ${DAY_LABEL[schedule.day_of_week]} ${hhmm(schedule.start_time)} цагийн хуваарийг устгана. Оюутан, багшийн хуваариас мөн хасагдана.`}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(schedule!.id);
            toast.success('Хуваарь устгагдлаа');
            setConfirmDelete(false);
            onClose();
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}
