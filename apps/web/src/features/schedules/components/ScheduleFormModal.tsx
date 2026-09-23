import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, Trash2, Users } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Modal, Segmented, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useRooms } from '@/features/rooms/hooks';
import { errorMessage } from '@/lib/api';
import { DAY_LABEL } from '@/lib/constants';
import { cn, shortName } from '@/lib/utils';
import type { Course, Schedule } from '@/types/models';
import { schedulesApi } from '../api';
import {
  MERGEABLE, SESSION_TYPE_LABEL, TIME_SLOTS, WEEK_DAYS, conflictMessage, findConflicts, hhmm,
  type ConflictKind, type SessionType,
} from '../lib/timetable';
import { useCreateSchedule, useDeleteSchedule, useUpdateSchedule } from '../hooks';

export interface ScheduleDraft {
  course_id?: string;
  day_of_week?: number;
  slot?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  draft?: ScheduleDraft;
  courses: Course[];
  /** Тухайн улирлын БҮХ хуваарь — давхцлыг бичих явцад шалгана */
  semesterSchedules: Schedule[];
  semesterId?: string;
}

export function ScheduleFormModal({ open, onClose, schedule, draft, courses, semesterSchedules, semesterId }: Props) {
  const toast = useToast();
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const remove = useDeleteSchedule();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<{ day_of_week: number; start_time: string; rooms: { building: string; code: string; capacity: number }[] }[]>([]);

  const [form, setForm] = useState({
    course_ids: [] as string[],
    session_type: 'lecture' as SessionType,
    is_online: false,
    day_of_week: 1,
    slot: 0,
    building: '',
    room: '',
    note: '',
  });

  const slot = TIME_SLOTS[form.slot];
  const editingGroup = !!schedule?.group_id;

  // Тухайн цагт өрөө сул эсэхийг серверээс тооцуулна
  const { data: rooms } = useRooms(open ? { semester_id: semesterId, day_of_week: form.day_of_week, start_time: slot?.start, end_time: slot?.end } : {});

  useEffect(() => {
    if (!open) return;
    setSuggested([]);
    if (schedule) {
      const idx = Math.max(0, TIME_SLOTS.findIndex((t) => t.start === hhmm(schedule.start_time)));
      const groupCourses = schedule.group_id
        ? semesterSchedules.filter((s) => s.group_id === schedule.group_id).map((s) => s.course_id)
        : [schedule.course_id];
      setForm({
        course_ids: groupCourses,
        session_type: (schedule.session_type ?? 'lecture') as SessionType,
        is_online: !!schedule.is_online,
        day_of_week: schedule.day_of_week,
        slot: idx,
        building: schedule.building ?? '',
        room: schedule.room ?? '',
        note: schedule.note ?? '',
      });
    } else {
      setForm({
        course_ids: draft?.course_id ? [draft.course_id] : courses[0] ? [courses[0].id] : [],
        session_type: 'lecture',
        is_online: false,
        day_of_week: draft?.day_of_week ?? 1,
        slot: draft?.slot ?? 0,
        building: '',
        room: '',
        note: '',
      });
    }
  }, [open, schedule, draft, courses, semesterSchedules]);

  // Сонголт өөрчлөгдвөл хуучин саналууд хүчингүй болно
  useEffect(() => {
    setSuggested([]);
  }, [form.course_ids.join(','), form.session_type]);

  const selected = form.course_ids.map((id) => courses.find((c) => c.id === id)).filter(Boolean) as Course[];
  const mergeable = MERGEABLE.includes(form.session_type);
  const totalStudents = selected.reduce((sum, c) => sum + (c.student_count ?? 0), 0);

  /** Нэгдсэн лекцэд нэмж болох хичээлүүд: ижил багш, өөр анги */
  const mergeCandidates = useMemo(() => {
    const first = selected[0];
    if (!first || !mergeable) return [];
    return courses.filter((c) => c.id !== first.id && c.class_id !== first.class_id && (!first.teacher_id || !c.teacher_id || c.teacher_id === first.teacher_id));
  }, [courses, selected, mergeable]);

  const room = rooms?.find((r) => r.building === form.building && r.code === form.room);

  /** Одоогийн сонголтын давхцал (нэг бүлгийн мөрүүдийг алгасна) */
  const conflicts = useMemo(() => {
    if (!slot || !selected.length) return [];
    const skip = new Set(
      schedule?.group_id ? semesterSchedules.filter((s) => s.group_id === schedule.group_id).map((s) => s.id) : schedule ? [schedule.id] : [],
    );
    const others = semesterSchedules.filter((s) => !skip.has(s.id));
    const out: { kind: ConflictKind; with: Schedule }[] = [];
    selected.forEach((c) => {
      findConflicts(
        {
          course_id: c.id,
          class_id: c.class_id,
          teacher_id: c.teacher_id,
          day_of_week: form.day_of_week,
          start_time: slot.start,
          end_time: slot.end,
          room: form.is_online ? null : form.room || null,
          building: form.is_online ? null : form.building || null,
          is_online: form.is_online,
        },
        others,
      ).forEach((x) => out.push(x as { kind: ConflictKind; with: Schedule }));
    });
    return out;
  }, [selected, slot, form, semesterSchedules, schedule]);

  const capacityWarning = !form.is_online && room && totalStudents > room.capacity;
  const canSubmit = selected.length > 0 && conflicts.length === 0 && (form.is_online || !!form.room);

  const onSuggest = async () => {
    if (!selected.length) return;
    setSuggesting(true);
    try {
      const res = await schedulesApi.suggestions(form.course_ids);
      setSuggested(res.slots.map((s) => ({ day_of_week: s.day_of_week, start_time: s.start_time, rooms: s.rooms })));
      if (!res.slots.length) toast.error('Бүх ангийн хувьд сул цаг олдсонгүй.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSuggesting(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !slot) return;
    const body = {
      day_of_week: form.day_of_week,
      start_time: slot.start,
      end_time: slot.end,
      building: form.is_online ? null : form.building || null,
      room: form.is_online ? null : form.room,
      session_type: form.session_type,
      is_online: form.is_online,
      note: form.note.trim() || null,
    };
    try {
      const res = schedule
        ? await update.mutateAsync({ id: schedule.id, ...body, course_id: form.course_ids[0] })
        : await create.mutateAsync({ ...body, course_ids: form.course_ids });
      res.warnings?.forEach((w) => toast.error(w));
      toast.success(
        schedule
          ? editingGroup
            ? 'Нэгдсэн лекцийн бүх анги зөөгдлөө'
            : 'Хуваарь шинэчлэгдлээ'
          : form.course_ids.length > 1
            ? `Нэгдсэн лекц ${form.course_ids.length} ангид нэмэгдлээ`
            : 'Хуваарьт цаг нэмэгдлээ',
      );
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const courseLabel = (c: Course) => `${c.class_name}, ${c.subject_name}${c.teacher_name ? `, ${shortName(c.teacher_name)}` : ', багшгүй'}`;
  const sortedCourses = [...courses].sort((a, b) => courseLabel(a).localeCompare(courseLabel(b)));
  const pending = create.isPending || update.isPending;

  const toggleMerge = (id: string) =>
    setForm((f) => ({ ...f, course_ids: f.course_ids.includes(id) ? f.course_ids.filter((x) => x !== id) : [...f.course_ids, id] }));

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title={schedule ? 'Хуваарь засах' : 'Хуваарьт цаг нэмэх'}
        description={
          schedule
            ? editingGroup
              ? 'Нэгдсэн лекц: өөрчлөлт бүх ангид нэгэн зэрэг хийгдэнэ.'
              : `${schedule.subject_name}, ${schedule.class_name}`
            : 'Нэг багш нэг өрөөнд хэд хэдэн ангид лекц уншиж болно.'
        }
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
              <Button variant="primary" type="submit" form="schedule-form" loading={pending} disabled={!canSubmit}>
                {schedule ? 'Хадгалах' : 'Нэмэх'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="schedule-form" onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Хичээлийн төрөл</p>
            <Segmented
              value={form.session_type}
              onChange={(v) => setForm((f) => ({ ...f, session_type: v, course_ids: MERGEABLE.includes(v) ? f.course_ids : f.course_ids.slice(0, 1) }))}
              options={(Object.keys(SESSION_TYPE_LABEL) as SessionType[]).map((t) => ({ value: t, label: SESSION_TYPE_LABEL[t] }))}
            />
          </div>

          <Select
            label={schedule ? 'Хичээл' : 'Үндсэн хичээл'}
            required
            value={form.course_ids[0] ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, course_ids: [e.target.value, ...f.course_ids.slice(1)] }))}
            options={sortedCourses.map((c) => ({ value: c.id, label: courseLabel(c) }))}
          />

          {mergeable && !schedule && mergeCandidates.length > 0 && (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-soft">
                Нэгдсэн лекц: өөр ангиуд нэмэх
                <span className="ml-1.5 font-normal text-faint">ижил багш, өөр анги</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mergeCandidates.map((c) => {
                  const active = form.course_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleMerge(c.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[13px] transition-colors',
                        active ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white text-muted hover:border-line-strong hover:text-ink',
                      )}
                    >
                      {c.class_name}
                      <span className="ml-1.5 text-xs text-faint">{c.subject_name}</span>
                    </button>
                  );
                })}
              </div>
              {form.course_ids.length > 1 && (
                <p className="num mt-2 flex items-center gap-1.5 text-[13px] text-accent-ink">
                  <Users className="h-3.5 w-3.5" />
                  {form.course_ids.length} анги, нийт {totalStudents} оюутан
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
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
              options={TIME_SLOTS.map((t, i) => ({ value: String(i), label: `${t.label}, ${t.start}–${t.end}` }))}
            />
            <div className="flex items-end">
              <Button className="w-full" icon={<Sparkles className="h-4 w-4" />} loading={suggesting} onClick={onSuggest} disabled={!selected.length}>
                Сул цаг санал болгох
              </Button>
            </div>
          </div>

          {suggested.length > 0 && (
            <div className="rounded-field border border-line bg-paper p-3">
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Бүх анги, багш сул байгаа цагууд</p>
              <div className="flex flex-wrap gap-1.5">
                {suggested.slice(0, 12).map((s) => {
                  const idx = TIME_SLOTS.findIndex((t) => t.start === s.start_time);
                  const active = s.day_of_week === form.day_of_week && idx === form.slot;
                  return (
                    <button
                      key={`${s.day_of_week}-${s.start_time}`}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          day_of_week: s.day_of_week,
                          slot: idx,
                          building: f.building || s.rooms[0]?.building || '',
                          room: f.room || s.rooms[0]?.code || '',
                        }))
                      }
                      className={cn(
                        'num rounded-full border px-3 py-1 text-[13px] transition-colors',
                        active ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink-soft hover:border-accent/50',
                      )}
                      title={s.rooms.length ? `Сул өрөө: ${s.rooms.map((r) => r.code).join(', ')}` : 'Тохирох өрөө алга'}
                    >
                      {DAY_LABEL[s.day_of_week].slice(0, 2)} {s.start_time}
                      {s.rooms[0] && <span className="ml-1.5 text-xs opacity-70">{s.rooms[0].code}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#1E4B8F]"
                checked={form.is_online}
                onChange={(e) => setForm((f) => ({ ...f, is_online: e.target.checked, building: '', room: '' }))}
              />
              Онлайн хичээл (өрөө эзэлэхгүй)
            </label>

            {!form.is_online && (
              <Select
                label="Өрөө"
                required
                value={form.building && form.room ? `${form.building}|${form.room}` : ''}
                onChange={(e) => {
                  const [building, code] = e.target.value.split('|');
                  setForm((f) => ({ ...f, building: building ?? '', room: code ?? '' }));
                }}
                placeholder="Өрөө сонгох"
                options={(rooms ?? []).map((r) => ({
                  value: `${r.building}|${r.code}`,
                  label: `${r.building}, ${r.code}, ${r.capacity} хүн${r.busy ? ', завгүй' : ''}${r.capacity < totalStudents ? ', багтаамж бага' : ''}`,
                }))}
                hint={
                  room
                    ? room.busy
                      ? `Энэ цагт завгүй: ${room.busy_with ?? ''}`
                      : `${room.capacity} хүний багтаамжтай, долоо хоногт ${room.weekly_sessions ?? 0} цаг ашиглагдаж байна`
                    : 'Завгүй өрөөнүүд жагсаалтад тэмдэглэгдэнэ'
                }
              />
            )}
          </div>

          <Textarea
            label="Тэмдэглэл"
            rows={2}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Жишээ нь: эхний долоо хоногт танхимаар"
          />

          <div aria-live="polite" className="flex flex-col gap-2">
            {conflicts.length > 0 ? (
              <div className="rounded-field border border-danger/25 bg-danger-soft px-3 py-2.5">
                {conflicts.map((c, i) => (
                  <p key={i} className="flex items-start gap-2 text-[13px] text-danger">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {conflictMessage(c.kind, c.with)}
                  </p>
                ))}
              </div>
            ) : canSubmit ? (
              <p className="flex items-center gap-2 rounded-field bg-success-soft px-3 py-2 text-[13px] text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {DAY_LABEL[form.day_of_week]}, {slot?.label}
                {form.course_ids.length > 1 ? `, ${form.course_ids.length} анги нэгдсэн лекц` : ''}: давхцалгүй
              </p>
            ) : null}

            {capacityWarning && (
              <p className="flex items-start gap-2 rounded-field bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Оюутны тоо ({totalStudents}) өрөөний багтаамжаас ({room?.capacity}) их байна. Илүү том өрөө сонгох, эсвэл ангиудыг салгахыг зөвлөж байна.
              </p>
            )}

            {form.course_ids.length > 1 && (
              <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                <Badge tone="accent">Нэгдсэн лекц</Badge>
                {selected.map((c) => (
                  <span key={c.id} className="rounded-full bg-paper px-2 py-0.5 text-xs">
                    {c.class_name}
                  </span>
                ))}
              </p>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title={editingGroup ? 'Нэгдсэн лекцийг устгах уу?' : 'Хуваарь устгах уу?'}
        confirmLabel="Устгах"
        loading={remove.isPending}
        description={
          schedule &&
          (editingGroup
            ? `${schedule.subject_name} нэгдсэн лекцийн бүх ангийн цагийг ${DAY_LABEL[schedule.day_of_week]} ${hhmm(schedule.start_time)}-аас устгана.`
            : `${schedule.subject_name} (${schedule.class_name}), ${DAY_LABEL[schedule.day_of_week]} ${hhmm(schedule.start_time)} цагийн хуваарийг устгана.`)
        }
        onConfirm={async () => {
          try {
            const res = await remove.mutateAsync({ id: schedule!.id, withGroup: editingGroup });
            toast.success(res.count > 1 ? `${res.count} ангийн цаг устгагдлаа` : 'Хуваарь устгагдлаа');
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
