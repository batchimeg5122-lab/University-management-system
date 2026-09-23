import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DataTable, ExportButton, Input, Modal, PageHeader, Panel, SearchInput, Segmented, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCourses } from '@/features/courses/hooks';
import { EXAM_TYPE_LABEL, type Exam, type ExamType } from '@/features/exams/api';
import { useDeleteExam, useExams, useSaveExam } from '@/features/exams/hooks';
import { useRooms } from '@/features/rooms/hooks';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { DAY_LABEL } from '@/lib/constants';
import { exportExcel } from '@/lib/excel';
import { formatDate } from '@/lib/utils';

const TONE: Record<ExamType, 'danger' | 'accent' | 'gold' | 'warn' | 'neutral'> = { final: 'danger', midterm: 'accent', quiz: 'gold', retake: 'warn', other: 'neutral' };

const weekday = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`).getDay();
  return DAY_LABEL[d === 0 ? 7 : d];
};
const daysLeft = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);

const empty = { course_id: '', title: '', exam_type: 'final' as ExamType, exam_date: '', start_time: '09:00', end_time: '11:00', building: '', room: '', is_online: false, note: '' };

/** Тодорхой огноотой шалгалтын хуваарь — mobile тоолуур, сануулга үүнийг ашиглана */
export default function ExamsPage() {
  useDocumentTitle('Шалгалтын хуваарь');
  const toast = useToast();
  const { can } = useRole();
  const editable = can('schedules');
  const { data: semester } = useCurrentSemester();
  const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');
  const [q, setQ] = useState('');
  const exams = useExams({ semester_id: semester?.id, upcoming: scope === 'upcoming' });
  const { data: courses } = useCourses({ semester_id: semester?.id });
  const { data: rooms } = useRooms();
  const save = useSaveExam();
  const remove = useDeleteExam();

  const [editing, setEditing] = useState<Exam | 'new' | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<Exam | null>(null);

  useEffect(() => {
    if (editing === 'new') setForm(empty);
    else if (editing)
      setForm({
        course_id: editing.course_id,
        title: editing.title ?? '',
        exam_type: editing.exam_type,
        exam_date: editing.exam_date,
        start_time: editing.start_time,
        end_time: editing.end_time,
        building: editing.building ?? '',
        room: editing.room ?? '',
        is_online: editing.is_online,
        note: editing.note ?? '',
      });
  }, [editing]);

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (exams.data ?? []).filter((e) => !s || `${e.subject_name} ${e.subject_code} ${e.class_name} ${e.room}`.toLowerCase().includes(s));
  }, [exams.data, q]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.end_time <= form.start_time) return toast.error('Дуусах цаг эхлэх цагаас хойш байна.');
    const room = rooms?.find((r) => r.code === form.room);
    try {
      await save.mutateAsync({
        ...(editing && editing !== 'new' ? { id: editing.id } : { course_id: form.course_id }),
        title: form.title || null,
        exam_type: form.exam_type,
        exam_date: form.exam_date,
        start_time: form.start_time,
        end_time: form.end_time,
        is_online: form.is_online,
        room: form.is_online ? null : form.room || null,
        building: form.is_online ? null : form.building || room?.building || null,
        note: form.note || null,
      });
      toast.success(editing === 'new' ? 'Шалгалт товлогдлоо. Оюутнуудад мэдэгдэл илгээгдлээ.' : 'Шалгалт шинэчлэгдлээ');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Шалгалтын хуваарь"
        description="Тодорхой огноотой шалгалт. Товлох, өөрчлөхөд оюутан, багшид автоматаар мэдэгдэл (push) очно."
        actions={
          <>
            <ExportButton
              disabled={!rows.length}
              onExport={() =>
                exportExcel('shalgalt', 'Шалгалт', [
                  { header: 'Огноо', value: (r: Exam) => r.exam_date },
                  { header: 'Гараг', value: (r) => weekday(r.exam_date) },
                  { header: 'Эхлэх', value: (r) => r.start_time },
                  { header: 'Дуусах', value: (r) => r.end_time },
                  { header: 'Хичээл', value: (r) => r.subject_name, width: 30 },
                  { header: 'Код', value: (r) => r.subject_code },
                  { header: 'Анги', value: (r) => r.class_name },
                  { header: 'Төрөл', value: (r) => EXAM_TYPE_LABEL[r.exam_type] },
                  { header: 'Байршил', value: (r) => (r.is_online ? 'Онлайн' : [r.building, r.room].filter(Boolean).join(' ')) },
                  { header: 'Багш', value: (r) => r.teacher_name, width: 24 },
                ], rows)
              }
            />
            {editable && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Шалгалт товлох</Button>}
          </>
        }
      />

      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Хичээл, анги, өрөө" />
          <Segmented value={scope} onChange={setScope} options={[{ value: 'upcoming', label: 'Удахгүй' }, { value: 'all', label: 'Энэ улирал' }]} />
          <p className="num text-[13px] text-muted sm:ml-auto">{rows.length} шалгалт</p>
        </div>
        <DataTable
          rows={rows}
          loading={exams.isLoading}
          error={exams.error}
          onRetry={exams.refetch}
          rowKey={(r) => r.id}
          empty={{ icon: CalendarCheck, title: 'Шалгалт товлоогүй байна', description: editable ? '"Шалгалт товлох" товчоор нэмнэ.' : undefined }}
          columns={[
            {
              key: 'date',
              header: 'Огноо',
              cell: (r) => {
                const left = daysLeft(r.exam_date);
                return (
                  <div className="whitespace-nowrap">
                    <p className="num font-medium">{formatDate(r.exam_date)}</p>
                    <p className="text-[12px] text-muted">
                      {weekday(r.exam_date)}
                      {left >= 0 && left <= 14 && <span className={left <= 3 ? 'text-danger' : 'text-warn'}> · {left === 0 ? 'Өнөөдөр' : `${left} хоног`}</span>}
                    </p>
                  </div>
                );
              },
            },
            { key: 'time', header: 'Цаг', cell: (r) => <span className="num whitespace-nowrap">{r.start_time}–{r.end_time}</span> },
            {
              key: 'course',
              header: 'Хичээл',
              cell: (r) => (
                <div>
                  <p className="font-medium">{r.subject_name}</p>
                  <p className="text-[12px] text-muted">{r.subject_code} · {r.class_name}</p>
                </div>
              ),
            },
            { key: 'type', header: 'Төрөл', hideOnMobile: true, cell: (r) => <Badge tone={TONE[r.exam_type]}>{EXAM_TYPE_LABEL[r.exam_type]}</Badge> },
            { key: 'place', header: 'Байршил', hideOnMobile: true, cell: (r) => (r.is_online ? <Badge tone="success">Онлайн</Badge> : [r.building, r.room].filter(Boolean).join(' ') || '—') },
            { key: 'teacher', header: 'Багш', hideOnMobile: true, cell: (r) => <span className="text-muted">{r.teacher_name ?? '—'}</span> },
            ...(editable
              ? [
                  {
                    key: 'actions',
                    header: '',
                    align: 'right' as const,
                    cell: (r: Exam) => (
                      <span className="flex justify-end gap-1">
                        <button onClick={() => setEditing(r)} className="rounded p-1.5 text-faint hover:bg-paper hover:text-ink" aria-label="Засах"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleting(r)} className="rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger" aria-label="Устгах"><Trash2 className="h-4 w-4" /></button>
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Шалгалт товлох' : 'Шалгалт засах'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button>
            <Button variant="primary" type="submit" form="exam-form" loading={save.isPending}>Хадгалах</Button>
          </>
        }
      >
        <form id="exam-form" onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Select
            wrapperClassName="sm:col-span-2"
            label="Хичээл"
            required
            disabled={editing !== 'new'}
            value={form.course_id}
            onChange={(e) => set('course_id', e.target.value)}
            placeholder="Сонгох"
            options={(courses ?? []).map((c) => ({ value: c.id, label: `${c.subject_name} · ${c.class_name ?? ''} (${c.teacher_name ?? 'багшгүй'})` }))}
          />
          <Select label="Төрөл" value={form.exam_type} onChange={(e) => set('exam_type', e.target.value as ExamType)} options={Object.entries(EXAM_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          <Input label="Гарчиг" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Хоосон бол төрлөөр" />
          <Input label="Огноо" type="date" required value={form.exam_date} onChange={(e) => set('exam_date', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Эхлэх" type="time" required value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
            <Input label="Дуусах" type="time" required value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft sm:col-span-2">
            <input type="checkbox" checked={form.is_online} onChange={(e) => set('is_online', e.target.checked)} className="h-4 w-4 accent-[#1E4B8F]" />
            Онлайн шалгалт
          </label>
          {!form.is_online && (
            <>
              <Select
                label="Өрөө"
                value={form.room}
                onChange={(e) => {
                  const r = rooms?.find((x) => x.code === e.target.value);
                  setForm((f) => ({ ...f, room: e.target.value, building: r?.building ?? f.building }));
                }}
                placeholder="Сонгох"
                options={(rooms ?? []).filter((r) => r.is_active).map((r) => ({ value: r.code, label: `${r.building} · ${r.code} (${r.capacity})` }))}
              />
              <Input label="Байр" value={form.building} onChange={(e) => set('building', e.target.value)} />
            </>
          )}
          <Textarea wrapperClassName="sm:col-span-2" label="Тэмдэглэл" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Жишээ: Тооны машин авчрах" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); toast.success('Шалгалт цуцлагдлаа'); }, onError: (e) => toast.error(errorMessage(e)) })}
        loading={remove.isPending}
        tone="danger"
        title="Шалгалт цуцлах уу?"
        description={deleting ? `${deleting.subject_name} — ${formatDate(deleting.exam_date)} ${deleting.start_time}. Оюутнуудад "цуцлагдлаа" мэдэгдэл очно.` : ''}
        confirmLabel="Цуцлах"
      />
    </>
  );
}
