import { useState, type FormEvent } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, PageLoader, Panel, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAnnouncements, useNotificationActions } from '@/features/notifications/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import type { Notification, UserRole } from '@/types/models';

const empty = { title: '', message: '', target_role: '', expire_at: '' };

export default function AnnouncementsPage() {
  useDocumentTitle('Зарлал');
  const toast = useToast();
  const { can } = useRole();
  const { data, isLoading, error, refetch } = useAnnouncements();
  const { create, update, remove } = useNotificationActions();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Notification | null>(null);
  const { values, bind, reset } = useFormState(empty);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ title: values.title, message: values.message, target_role: (values.target_role || null) as UserRole | null, expire_at: values.expire_at || null });
      toast.success('Зарлал нийтлэгдлээ');
      setOpen(false);
      reset(empty);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Зарлал"
        description="Бүх хэрэглэгч эсвэл тодорхой эрхтэй хэрэглэгчдэд мэдээлэл хүргэнэ."
        actions={can('announcements') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Зарлал нийтлэх</Button>}
      />

      <Panel flush>
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data?.length ? (
          <EmptyState icon={Megaphone} title="Зарлал алга" />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((n) => (
              <li key={n.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <Badge tone={n.target_role ? 'accent' : 'neutral'}>{n.target_role ? ROLE_LABEL[n.target_role] : 'Бүх хэрэглэгч'}</Badge>
                    {!n.is_published && <Badge tone="warn">Нийтлээгүй</Badge>}
                  </div>
                  <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">{n.message}</p>
                  <p className="mt-1.5 text-xs text-faint">{n.created_by_name}, {formatDateTime(n.created_at)}</p>
                </div>
                {can('announcements') && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: n.id, is_published: !n.is_published })}>
                      {n.is_published ? 'Нуух' : 'Нийтлэх'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(n)} aria-label="Устгах"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Зарлал нийтлэх" footer={<><Button onClick={() => setOpen(false)}>Болих</Button><Button variant="primary" type="submit" form="ann-form" loading={create.isPending}>Нийтлэх</Button></>}>
        <form id="ann-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Гарчиг" required wrapperClassName="sm:col-span-2" {...bind('title')} />
          <Textarea label="Агуулга" required wrapperClassName="sm:col-span-2" rows={5} {...bind('message')} />
          <Select label="Хүлээн авагч" placeholder="Бүх хэрэглэгч" options={(['student', 'teacher', 'academic', 'finance', 'management'] as UserRole[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} {...bind('target_role')} />
          <Input label="Дуусах огноо" type="date" hint="Хоосон бол хугацаагүй" {...bind('expire_at')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        tone="danger"
        title="Зарлал устгах уу?"
        confirmLabel="Устгах"
        description={toDelete?.title}
        loading={remove.isPending}
        onConfirm={async () => { await remove.mutateAsync(toDelete!.id); toast.success('Зарлал устгагдлаа'); setToDelete(null); }}
      />
    </>
  );
}
