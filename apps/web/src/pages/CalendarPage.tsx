import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Input, Modal, PageHeader, Panel, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EVENT_TYPE, useDeleteEvent, useEvents, useSaveEvent, type AcademicEvent, type EventType } from '@/features/calendar/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/constants';
import { cn, formatDate } from '@/lib/utils';
import type { UserRole } from '@/types/models';

const MONTHS = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
const WD = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const empty = { title: '', event_type: 'event' as EventType, start_date: '', end_date: '', description: '', target_role: '' as UserRole | '', notify: false };

/** Академик календарь — бүх хэрэглэгч харна, Сургалтын алба засна */
export default function CalendarPage() {
  useDocumentTitle('Академик календарь');
  const toast = useToast();
  const { can } = useRole();
  const editable = can('schedules');
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [editing, setEditing] = useState<AcademicEvent | 'new' | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<AcademicEvent | null>(null);
  const save = useSaveEvent();
  const remove = useDeleteEvent();

  // Сарын сүлжээ (Даваагаас эхэлнэ)
  const grid = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);
  const from = iso(grid[0]);
  const to = iso(grid[41]);
  const { data: events } = useEvents(from, to);
  const today = iso(new Date());

  useEffect(() => {
    if (editing === 'new') setForm({ ...empty, start_date: today, end_date: today });
    else if (editing) setForm({ title: editing.title, event_type: editing.event_type, start_date: editing.start_date, end_date: editing.end_date, description: editing.description ?? '', target_role: editing.target_role ?? '', notify: false });
  }, [editing, today]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({
        ...(editing && editing !== 'new' ? { id: editing.id } : {}),
        title: form.title,
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        description: form.description || null,
        target_role: form.target_role || null,
        notify: form.notify,
      });
      toast.success('Хадгалагдлаа');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const eventsOn = (d: string) => (events ?? []).filter((e) => e.start_date <= d && e.end_date >= d);
  const upcoming = (events ?? []).filter((e) => e.end_date >= today).slice(0, 12);

  return (
    <>
      <PageHeader
        title="Академик календарь"
        description="Улирлын эхлэл, шалгалтын долоо хоног, баяр ёслол, бүртгэлийн хугацаа."
        actions={editable && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Үйл явдал нэмэх</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel
          title={`${cursor.getFullYear()} оны ${MONTHS[cursor.getMonth()]}`}
          actions={
            <span className="flex gap-1">
              <Button size="sm" variant="ghost" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Өмнөх сар" />
              <Button size="sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Өнөөдөр</Button>
              <Button size="sm" variant="ghost" icon={<ChevronRight className="h-4 w-4" />} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Дараагийн сар" />
            </span>
          }
        >
          <div className="grid grid-cols-7 border-l border-t border-line text-[12px]">
            {WD.map((w) => (
              <div key={w} className="border-b border-r border-line bg-paper px-2 py-1.5 text-center font-medium text-muted">{w}</div>
            ))}
            {grid.map((d) => {
              const key = iso(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const list = eventsOn(key);
              const holiday = list.some((e) => e.event_type === 'holiday' || e.event_type === 'break');
              return (
                <div key={key} className={cn('min-h-[88px] border-b border-r border-line p-1', !inMonth && 'bg-paper/60', holiday && inMonth && 'bg-danger-soft/40')}>
                  <p className={cn('num mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[12px]', key === today ? 'bg-accent font-semibold text-white' : inMonth ? 'text-ink' : 'text-faint', d.getDay() === 0 && inMonth && key !== today && 'text-danger')}>{d.getDate()}</p>
                  {list.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => editable && setEditing(e)}
                      title={`${e.title} (${formatDate(e.start_date)}${e.end_date !== e.start_date ? ` – ${formatDate(e.end_date)}` : ''})`}
                      className="mb-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium"
                      style={{ background: EVENT_TYPE[e.event_type].soft, color: EVENT_TYPE[e.event_type].color }}
                    >
                      {e.title}
                    </button>
                  ))}
                  {list.length > 3 && <p className="px-1 text-[10px] text-muted">+{list.length - 3}</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
            {Object.entries(EVENT_TYPE).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-muted"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: v.color }} />{v.label}</span>
            ))}
          </div>
        </Panel>

        <Panel title="Удахгүй">
          {!upcoming.length ? (
            <p className="py-6 text-center text-sm text-muted"><CalendarRange className="mx-auto mb-2 h-6 w-6 text-faint" />Энэ хугацаанд үйл явдал алга</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1 h-10 w-1 shrink-0 rounded-full" style={{ background: EVENT_TYPE[e.event_type].color }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="num text-[12px] text-muted">{formatDate(e.start_date)}{e.end_date !== e.start_date ? ` – ${formatDate(e.end_date)}` : ''}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge>{EVENT_TYPE[e.event_type].label}</Badge>
                      {e.target_role && <Badge tone="accent">{ROLE_LABEL[e.target_role]}</Badge>}
                    </div>
                  </div>
                  {editable && (
                    <button onClick={() => setDeleting(e)} className="self-start rounded p-1 text-faint hover:bg-danger-soft hover:text-danger" aria-label="Устгах"><Trash2 className="h-4 w-4" /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Үйл явдал нэмэх' : 'Үйл явдал засах'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button>
            <Button variant="primary" type="submit" form="event-form" loading={save.isPending}>Хадгалах</Button>
          </>
        }
      >
        <form id="event-form" onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input wrapperClassName="sm:col-span-2" label="Гарчиг" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Цагаан сарын амралт" />
          <Select label="Төрөл" value={form.event_type} onChange={(e) => set('event_type', e.target.value as EventType)} options={Object.entries(EVENT_TYPE).map(([value, v]) => ({ value, label: v.label }))} />
          <Select label="Хэнд" value={form.target_role} onChange={(e) => set('target_role', e.target.value as UserRole | '')} placeholder="Бүх хэрэглэгч" options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
          <Input label="Эхлэх" type="date" required value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          <Input label="Дуусах" type="date" required value={form.end_date} min={form.start_date} onChange={(e) => set('end_date', e.target.value)} />
          <Textarea wrapperClassName="sm:col-span-2" label="Тайлбар" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          {editing === 'new' && (
            <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
              <input type="checkbox" checked={form.notify} onChange={(e) => set('notify', e.target.checked)} className="h-4 w-4 accent-[#1E4B8F]" />
              Хэрэглэгчдэд mobile push илгээх
            </label>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); toast.success('Устгагдлаа'); }, onError: (e) => toast.error(errorMessage(e)) })}
        loading={remove.isPending}
        tone="danger"
        title="Үйл явдал устгах уу?"
        description={deleting?.title}
        confirmLabel="Устгах"
      />
    </>
  );
}
