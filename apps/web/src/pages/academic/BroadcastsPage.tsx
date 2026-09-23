import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, Megaphone, Send, Smartphone, Trash2, Users } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DataTable, Input, MultiPicker, PageHeader, Panel, ProgressBar, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { broadcastsApi, type Audience, type AudienceKind, type Broadcast } from '@/features/broadcasts/api';
import { useBroadcasts, useDeleteBroadcast, useSendBroadcast } from '@/features/broadcasts/hooks';
import { useClasses } from '@/features/classes/hooks';
import { useCourses } from '@/features/courses/hooks';
import { useDepartments } from '@/features/departments/hooks';
import { usePrograms } from '@/features/programs/hooks';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/constants';
import { cn, formatDateTime, formatNumber } from '@/lib/utils';
import type { UserRole } from '@/types/models';

const KINDS: { value: AudienceKind; label: string }[] = [
  { value: 'all', label: 'Бүгд' },
  { value: 'role', label: 'Эрхээр' },
  { value: 'school', label: 'Сургууль' },
  { value: 'program', label: 'Хөтөлбөр' },
  { value: 'class', label: 'Анги' },
  { value: 'course', label: 'Хичээл' },
];

const emptyAudience: Audience = { kind: 'class', role: null, ids: [], include_teachers: false };

/** Утасны lock screen дээрх push-ийг дуурайсан урьдчилан харах */
function PhonePreview({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto w-[260px] rounded-[34px] border-[6px] border-ink bg-gradient-to-b from-[#1E4B8F] to-[#0E2A55] p-3 shadow-pop">
      <p className="mt-6 text-center text-[42px] font-light leading-none text-white">09:41</p>
      <p className="mb-5 text-center text-[11px] text-white/70">Мягмар, 9-р сарын 22</p>
      <div className="rounded-2xl bg-white/90 p-3 backdrop-blur">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-accent text-[8px] font-bold text-white">ИЗ</span>
          ИХ ЗАСАГ · одоо
        </div>
        <p className="line-clamp-1 text-[12.5px] font-semibold text-ink">{title || 'Гарчиг'}</p>
        <p className="line-clamp-3 text-[12px] text-ink-soft">{message || 'Мэдэгдлийн агуулга энд харагдана.'}</p>
      </div>
      <div className="mx-auto mt-24 h-1 w-24 rounded-full bg-white/60" />
    </div>
  );
}

export default function BroadcastsPage() {
  useDocumentTitle('Мэдэгдэл илгээх');
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>(emptyAudience);
  const [sendPush, setSendPush] = useState(true);
  const [scheduled, setScheduled] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [preview, setPreview] = useState<{ count: number; label: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState<Broadcast | null>(null);

  const { data: semester } = useCurrentSemester();
  const { data: schools } = useDepartments({ level: 'school' });
  const { data: programs } = usePrograms();
  const { data: classes } = useClasses();
  const { data: courses } = useCourses({ semester_id: semester?.id });
  const history = useBroadcasts();
  const send = useSendBroadcast();
  const remove = useDeleteBroadcast();

  const options = useMemo(() => {
    switch (audience.kind) {
      case 'school':
        return (schools ?? []).map((d) => ({ value: d.id, label: d.name, hint: d.code ?? '' }));
      case 'program':
        return (programs ?? []).map((p) => ({ value: p.id, label: p.name, hint: p.department_name ?? '' }));
      case 'class':
        return (classes ?? []).map((c) => ({ value: c.id, label: c.code, hint: `${c.program_name ?? ''} · ${c.student_count ?? 0} оюутан` }));
      case 'course':
        return (courses ?? []).map((c) => ({ value: c.id, label: `${c.subject_name} · ${c.class_name ?? ''}`, hint: c.teacher_name ?? '' }));
      default:
        return [];
    }
  }, [audience.kind, schools, programs, classes, courses]);

  const audienceReady = audience.kind === 'all' || (audience.kind === 'role' ? !!audience.role : audience.ids.length > 0);

  // Хүлээн авагчийн тоог шууд тооцно
  useEffect(() => {
    if (!audienceReady) return setPreview(null);
    setPreviewing(true);
    const t = setTimeout(() => {
      broadcastsApi
        .preview(audience)
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewing(false));
    }, 400);
    return () => clearTimeout(t);
  }, [audience, audienceReady]);

  const setKind = (kind: AudienceKind) => setAudience({ kind, role: null, ids: [], include_teachers: false });

  const canSend = title.trim().length >= 3 && message.trim().length >= 3 && audienceReady && (preview?.count ?? 0) > 0 && (!scheduled || !!publishAt);

  const doSend = async () => {
    try {
      const res = await send.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        audience,
        send_push: sendPush,
        publish_at: scheduled && publishAt ? new Date(publishAt).toISOString() : null,
      });
      toast.success(scheduled ? `Товлогдлоо: ${formatNumber(res.recipient_count)} хүлээн авагч` : `${formatNumber(res.recipient_count)} хүнд илгээгдлээ`);
      setTitle('');
      setMessage('');
      setScheduled(false);
      setPublishAt('');
      setConfirm(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Мэдэгдэл илгээх төв" description="Сургууль, хөтөлбөр, анги, хичээлээр чиглүүлж web болон mobile push мэдэгдэл илгээнэ. Уншсан статистикийг хянана." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Шинэ мэдэгдэл">
          <div className="flex flex-col gap-4">
            <Input label="Гарчиг" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Жишээ: Маргаашийн хичээл онлайн болно" />
            <Textarea label="Агуулга" required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000} placeholder="Мэдэгдлийн дэлгэрэнгүй..." />

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Хүлээн авагч</p>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn('rounded-full border px-3 py-1 text-[13px]', audience.kind === k.value ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-line-strong')}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {audience.kind === 'role' && (
              <Select
                label="Эрх"
                value={audience.role ?? ''}
                onChange={(e) => setAudience((a) => ({ ...a, role: (e.target.value || null) as UserRole | null }))}
                placeholder="Сонгох"
                options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
              />
            )}

            {['school', 'program', 'class', 'course'].includes(audience.kind) && (
              <>
                <MultiPicker
                  label={KINDS.find((k) => k.value === audience.kind)?.label}
                  options={options}
                  value={audience.ids}
                  onChange={(ids) => setAudience((a) => ({ ...a, ids }))}
                />
                <label className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <input type="checkbox" checked={audience.include_teachers} onChange={(e) => setAudience((a) => ({ ...a, include_teachers: e.target.checked }))} className="h-4 w-4 accent-[#1E4B8F]" />
                  Хичээл заадаг багш нарт мөн илгээх
                </label>
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-2 rounded-field border border-line p-3 text-[13px]">
                <input type="checkbox" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1E4B8F]" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-ink"><Smartphone className="h-3.5 w-3.5" />Mobile push илгээх</span>
                  <span className="text-muted">Утасны түгжигдсэн дэлгэц дээр гарна</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-field border border-line p-3 text-[13px]">
                <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1E4B8F]" />
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 font-medium text-ink"><CalendarClock className="h-3.5 w-3.5" />Товлож илгээх</span>
                  {scheduled ? (
                    <input type="datetime-local" value={publishAt} min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)} onChange={(e) => setPublishAt(e.target.value)} className="field mt-1.5 h-8 w-full text-[13px]" />
                  ) : (
                    <span className="text-muted">Заасан цагт автоматаар</span>
                  )}
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted" />
                {previewing ? (
                  <span className="text-muted">Тоолж байна…</span>
                ) : preview ? (
                  <span>
                    <b className="num">{formatNumber(preview.count)}</b> хүлээн авагч · <span className="text-muted">{preview.label}</span>
                  </span>
                ) : (
                  <span className="text-muted">Хүлээн авагчаа сонгоно уу</span>
                )}
              </p>
              <Button variant="primary" className="sm:ml-auto" icon={<Send className="h-4 w-4" />} disabled={!canSend} onClick={() => setConfirm(true)}>
                {scheduled ? 'Товлох' : 'Илгээх'}
              </Button>
            </div>
          </div>
        </Panel>

        <div className="hidden lg:block">
          <p className="mb-3 text-center text-[13px] text-muted">Утсан дээр харагдах байдал</p>
          <PhonePreview title={title} message={message} />
        </div>
      </div>

      <Panel flush title="Илгээсэн түүх" className="mt-6" description="30 секунд тутамд шинэчлэгдэнэ">
        <DataTable
          rows={history.data}
          loading={history.isLoading}
          error={history.error}
          onRetry={history.refetch}
          rowKey={(r) => r.id}
          empty={{ icon: Megaphone, title: 'Илгээсэн мэдэгдэл алга' }}
          columns={[
            { key: 'time', header: 'Огноо', cell: (r) => <span className="num whitespace-nowrap text-muted">{formatDateTime(r.publish_at ?? r.created_at)}</span> },
            {
              key: 'title',
              header: 'Мэдэгдэл',
              cell: (r) => (
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-[12px] text-muted">{r.audience_label}</p>
                </div>
              ),
            },
            { key: 'count', header: 'Хүлээн авагч', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{formatNumber(r.recipient_count)}</span> },
            {
              key: 'read',
              header: 'Уншсан',
              cell: (r) => {
                const pct = r.recipient_count ? Math.round((r.read_count / r.recipient_count) * 100) : 0;
                return (
                  <div className="w-32">
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="num">{formatNumber(r.read_count)}</span>
                      <span className="num text-muted">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} tone={pct >= 60 ? 'success' : 'accent'} />
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Төлөв',
              align: 'right',
              cell: (r) => (
                <span className="flex justify-end gap-1.5">
                  {r.send_push && <Badge tone="accent"><BellRing className="mr-1 inline h-3 w-3" />Push</Badge>}
                  {r.status === 'scheduled' ? <Badge tone="gold">Товлосон</Badge> : <Badge tone="success">Илгээсэн</Badge>}
                </span>
              ),
            },
            {
              key: 'del',
              header: '',
              align: 'right',
              cell: (r) => (
                <button onClick={(e) => { e.stopPropagation(); setDeleting(r); }} className="rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger" aria-label="Устгах">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
            },
          ]}
        />
      </Panel>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doSend}
        loading={send.isPending}
        title={scheduled ? 'Мэдэгдэл товлох уу?' : 'Мэдэгдэл илгээх үү?'}
        description={`"${title}" мэдэгдлийг ${formatNumber(preview?.count ?? 0)} хүнд ${scheduled && publishAt ? `${formatDateTime(new Date(publishAt))}-д ` : ''}илгээнэ${sendPush ? ' (mobile push-тай)' : ''}. Илгээсний дараа буцаах боломжгүй.`}
        confirmLabel={scheduled ? 'Товлох' : 'Илгээх'}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); toast.success('Устгагдлаа'); }, onError: (e) => toast.error(errorMessage(e)) })}
        loading={remove.isPending}
        tone="danger"
        title="Мэдэгдэл устгах уу?"
        description="Бүх хүлээн авагчийн мэдэгдлийн жагсаалтаас устгагдана. Илгээгдсэн push-ийг буцаах боломжгүй."
        confirmLabel="Устгах"
      />
    </>
  );
}
