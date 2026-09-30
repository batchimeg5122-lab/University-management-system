import { useEffect, useState } from 'react';
import { CalendarX2, MapPin, RotateCcw, Users, Video } from 'lucide-react';
import { Badge, Button, Modal, Textarea, useToast } from '@/components/ui';
import { DAY_LABEL } from '@/lib/constants';
import { errorMessage } from '@/lib/api';
import { cn, hhmm, shortName } from '@/lib/utils';
import type { Schedule } from '@/types/models';
import { useCancelClass, useRestoreClass } from '../hooks';
import { nextDateOfWeekday, todayIso } from '../lib/timetable';

/**
 * Багш яаралтай ажлаар хичээлдээ орох боломжгүй болсон үед
 * тухайн өдрийн хичээлийг цуцлах цонх.
 * Цуцалсны дараа систем тухайн хичээлд хамрагдах бүх оюутанд
 * "Өнөөдрийн хичээл цуцлагдлаа" мэдэгдлийг автоматаар илгээнэ.
 */
export function CancelClassModal({ session, onClose, date }: { session: Schedule | null; onClose: () => void; date?: string }) {
  const toast = useToast();
  const cancel = useCancelClass();
  const restore = useRestoreClass();
  const [reason, setReason] = useState('');
  const [day, setDay] = useState('');

  const target = date || (session ? nextDateOfWeekday(session.day_of_week) : '');
  useEffect(() => {
    setReason('');
    setDay(target);
  }, [session?.id, target]);

  if (!session) return null;

  const today = todayIso();
  const chosen = day || target;
  const isToday = chosen === today;
  const cancelled = (session.cancellations ?? []).find((c) => c.cancel_date === chosen);
  const label = isToday ? 'Өнөөдөр хичээл орохгүй' : `${chosen}-нд хичээл орохгүй`;

  // Дараагийн 4 удаагийн ижил гарагийн хичээл
  const options = [0, 1, 2, 3].map((w) => nextDateOfWeekday(session.day_of_week, w));

  const doCancel = async () => {
    try {
      await cancel.mutateAsync({ id: session.id, date: chosen, reason: reason.trim() || null });
      toast.success(
        isToday
          ? 'Өнөөдрийн хичээл цуцлагдлаа. Оюутнуудад мэдэгдэл илгээгдлээ.'
          : `${chosen}-ны хичээл цуцлагдлаа. Оюутнуудад мэдэгдэл илгээгдлээ.`,
      );
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const doRestore = async () => {
    try {
      await restore.mutateAsync({ id: session.id, date: chosen });
      toast.success('Цуцлалт хүчингүй болж, хичээл хэвийн орно.');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={session.subject_name ?? 'Хичээл'}
      description={`${DAY_LABEL[session.day_of_week]} ${hhmm(session.start_time)}–${hhmm(session.end_time)}`}
      footer={
        cancelled ? (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Хаах</Button>
            <Button variant="primary" icon={<RotateCcw className="h-4 w-4" />} loading={restore.isPending} onClick={doRestore}>
              Цуцлалтыг буцаах
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Болих</Button>
            <Button variant="danger" icon={<CalendarX2 className="h-4 w-4" />} loading={cancel.isPending} onClick={doCancel}>
              {label}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid gap-1.5 rounded-box bg-paper p-3 text-[13px]">
          <Row icon={<Users className="h-3.5 w-3.5" />} text={`${session.class_name ?? '—'} · ${session.student_count ?? 0} оюутан`} />
          <Row
            icon={session.is_online ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            text={session.is_online ? 'Онлайн' : [session.building, session.room].filter(Boolean).join(', ') || 'Өрөө тодорхойгүй'}
          />
          {session.teacher_name && <Row icon={<span className="w-3.5" />} text={shortName(session.teacher_name)} />}
        </dl>

        {cancelled ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="danger">Цуцлагдсан</Badge>
              {isToday && <Badge tone="warn">Өнөөдөр</Badge>}
            </div>
            <p className="text-[13px] text-muted">
              {chosen}-ны хичээл цуцлагдсан бөгөөд оюутнуудад мэдэгдэл илгээгдсэн.
              {cancelled.reason ? ` Шалтгаан: ${cancelled.reason}` : ''}
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Цуцлах өдөр</p>
              <div className="flex flex-wrap gap-2">
                {options.map((o) => {
                  const taken = (session.cancellations ?? []).some((c) => c.cancel_date === o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setDay(o)}
                      className={cn(
                        'num rounded-field border px-2.5 py-1.5 text-[13px] transition-colors',
                        o === chosen ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line bg-white text-ink-soft hover:border-line-strong',
                      )}
                    >
                      {o}
                      {o === today && <span className="ml-1.5 text-[11px] text-accent">Өнөөдөр</span>}
                      {taken && <span className="ml-1.5 text-[11px] text-danger">цуцлагдсан</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <Textarea
              label="Шалтгаан (сонголтоор)"
              hint="Шалтгааныг оюутнуудад илгээх мэдэгдэлд хамт харуулна"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Жишээ: Яаралтай ажил гарсан"
            />
            <p className="rounded-field bg-warn-soft px-3 py-2 text-[12.5px] text-ink-soft">
              Зөвхөн сонгосон өдрийн хичээл цуцлагдана. Долоо хоногийн хуваарь хэвээр үлдэнэ.
              Цуцалсны дараа <b>{session.student_count ?? 0}</b> оюутанд мэдэгдэл автоматаар илгээгдэнэ.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-soft">
      <span className="text-faint">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
