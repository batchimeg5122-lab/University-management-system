import { useState, type FormEvent } from 'react';
import { BadgeCheck, KeyRound, Plus, ShieldCheck } from 'lucide-react';
import { Avatar, Badge, Button, ConfirmDialog, DataTable, Input, Modal, PageHeader, Panel, SearchInput, Select } from '@/components/ui';
import { UserStatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { CredentialsDialog, type Credentials } from '@/features/users/components/CredentialsDialog';
import { UserEditModal } from '@/features/users/components/UserEditModal';
import { useConfirmAllEmails, useSaveUser, useUsers } from '@/features/users/hooks';
import { useSession } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { errorMessage } from '@/lib/api';
import { ROLE_LABEL, USER_STATUS_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { UserRole } from '@/types/models';

const empty = { last_name: '', first_name: '', email: '', phone: '', role: 'teacher', password: '' };
const roleOptions = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));

export default function UsersPage() {
  useDocumentTitle('Хэрэглэгч, эрх');
  const toast = useToast();
  const me = useSession();
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const { data, isLoading, error, refetch } = useUsers(filters);
  const create = useSaveUser();
  const confirmAll = useConfirmAllEmails();
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { values, bind, reset } = useFormState(empty);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const saved = await create.mutateAsync({
        last_name: values.last_name, first_name: values.first_name, email: values.email.trim(),
        phone: values.phone, role: values.role as UserRole, password: values.password || undefined,
      });
      toast.success('Хэрэглэгч үүслээ');
      setCreating(false);
      reset(empty);
      setCredentials({ fullName: saved.full_name, loginIds: [{ label: 'И-мэйл', value: saved.email ?? values.email }], password: saved.initial_password ?? null });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Хэрэглэгч, эрх"
        description="Хэрэглэгчийн мэдээлэл, эрх, нууц үгийг удирдана. Өөрчлөлт бүр үйлдлийн түүхэнд бүртгэгдэнэ."
        actions={
          <>
            <Button icon={<BadgeCheck className="h-4 w-4" />} onClick={() => setConfirmAllOpen(true)}>Эрхүүдийг баталгаажуулах</Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { reset(empty); setCreating(true); }}>Хэрэглэгч нэмэх</Button>
          </>
        }
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} placeholder="Нэр эсвэл и-мэйл" />
          <Select className="sm:w-48" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))} placeholder="Бүх эрх" options={roleOptions} />
          <Select className="sm:w-40" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} placeholder="Бүх төлөв" options={Object.entries(USER_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
          <p className="num text-[13px] text-muted sm:ml-auto">{data?.length ?? 0} хэрэглэгч</p>
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEditingId(r.id)}
          empty={{ icon: ShieldCheck, title: 'Хэрэглэгч олдсонгүй' }}
          columns={[
            {
              key: 'name', header: 'Хэрэглэгч',
              cell: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.full_name} size={30} />
                  <div className="min-w-0">
                    <p className="font-medium">{r.full_name}{r.id === me.user.id && <span className="ml-1.5 text-xs font-normal text-faint">(та)</span>}</p>
                    <p className="truncate text-xs text-faint">{r.email}</p>
                  </div>
                </div>
              ),
            },
            { key: 'role', header: 'Эрх', cell: (r) => <Badge tone={r.role === 'super_admin' ? 'gold' : r.role === 'student' ? 'neutral' : 'accent'}>{ROLE_LABEL[r.role]}</Badge> },
            { key: 'created', header: 'Бүртгэсэн', hideOnMobile: true, cell: (r) => <span className="num text-muted">{formatDate(r.created_at)}</span> },
            { key: 'status', header: 'Төлөв', cell: (r) => <UserStatusBadge status={r.status} /> },
            {
              key: 'actions', header: '', align: 'right',
              cell: (r) => (
                <Button size="sm" variant="ghost" icon={<KeyRound className="h-3.5 w-3.5" />} onClick={(e) => { e.stopPropagation(); setEditingId(r.id); }}>
                  Засах
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Хэрэглэгч нэмэх"
        description="Оюутан, багшийг Сургалт хэсгээс бүртгэвэл профайл нь хамт үүснэ."
        footer={<><Button onClick={() => setCreating(false)}>Болих</Button><Button variant="primary" type="submit" form="user-create-form" loading={create.isPending}>Үүсгэх</Button></>}
      >
        <form id="user-create-form" onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
          <Input label="Овог" required {...bind('last_name')} />
          <Input label="Нэр" required {...bind('first_name')} />
          <Input label="И-мэйл" type="email" required {...bind('email')} />
          <Input label="Утас" {...bind('phone')} />
          <Select label="Эрх" options={roleOptions} {...bind('role')} />
          <Input label="Анхны нууц үг" type="text" autoComplete="new-password" placeholder="Хоосон бол автоматаар үүснэ" {...bind('password')} />
        </form>
      </Modal>

      <UserEditModal userId={editingId} currentUserId={me.user.id} onClose={() => setEditingId(null)} />
      <ConfirmDialog
        open={confirmAllOpen}
        onClose={() => setConfirmAllOpen(false)}
        loading={confirmAll.isPending}
        title="Баталгаажаагүй бүх эрхийг баталгаажуулах уу?"
        confirmLabel="Баталгаажуулах"
        description="Системд бүртгэлтэй боловч «Email not confirmed» төлөвтэй бүх хэрэглэгчийн эрхийг баталгаажуулж, нэвтрэх боломжтой болгоно."
        onConfirm={async () => {
          try {
            const r = await confirmAll.mutateAsync();
            toast.success(r.confirmed ? `${r.confirmed} хэрэглэгчийн эрх баталгаажлаа` : 'Баталгаажаагүй эрх олдсонгүй');
            if (r.failed.length) toast.error(`Баталгаажуулж чадаагүй: ${r.failed.slice(0, 3).join(', ')}`);
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setConfirmAllOpen(false);
        }}
      />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  );
}
