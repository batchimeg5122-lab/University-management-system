import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { Badge, Button, ConfirmDialog, ErrorState, Input, Modal, PageLoader, Segmented, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClasses } from '@/features/classes/hooks';
import { useDepartments } from '@/features/departments/hooks';
import { errorMessage } from '@/lib/api';
import { EMPLOYEE_TYPE_LABEL, ROLE_LABEL, STUDENT_STATUS_LABEL, USER_STATUS_LABEL } from '@/lib/constants';
import { cn, formatDateTime } from '@/lib/utils';
import type { UserDetail } from '@/types/models';
import type { UserUpdateInput } from '../api';
import { useConfirmEmail, useResetPassword, useUpdateUser, useUser } from '../hooks';
import { CredentialsDialog, type Credentials } from './CredentialsDialog';

type Tab = 'basic' | 'profile' | 'password';
type Form = Record<string, string | boolean>;

const toForm = (d: UserDetail): { user: Form; student: Form; employee: Form } => ({
  user: {
    last_name: d.user.last_name, first_name: d.user.first_name, email: d.user.email ?? '',
    phone: d.user.phone ?? '', role: d.user.role, status: d.user.status,
  },
  student: d.student
    ? {
        student_code: d.student.student_code, register_number: d.student.register_number ?? '',
        class_id: d.student.class_id ?? '', enrollment_year: String(d.student.enrollment_year ?? ''), status: d.student.status,
      }
    : {},
  employee: d.employee
    ? {
        employee_code: d.employee.employee_code, employee_type: d.employee.employee_type, department_id: d.employee.department_id ?? '',
        position: d.employee.position ?? '', specialization: d.employee.specialization ?? '', academic_degree: d.employee.academic_degree ?? '',
        is_active: d.employee.is_active,
      }
    : {},
});

/** Зөвхөн өөрчлөгдсөн талбаруудыг буцаана */
function diff(next: Form, prev: Form) {
  const out: Record<string, unknown> = {};
  Object.keys(next).forEach((k) => {
    if (next[k] !== prev[k]) out[k] = typeof next[k] === 'string' ? (next[k] as string).trim() : next[k];
  });
  return out;
}

export function UserEditModal({ userId, currentUserId, onClose }: { userId: string | null; currentUserId: string; onClose: () => void }) {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useUser(userId ?? undefined);
  const update = useUpdateUser();
  const reset = useResetPassword();
  const confirm = useConfirmEmail();
  const { data: classes } = useClasses();
  const { data: departments } = useDepartments({ level: 'department' });

  const [tab, setTab] = useState<Tab>('basic');
  const [initial, setInitial] = useState<ReturnType<typeof toForm> | null>(null);
  const [form, setForm] = useState<ReturnType<typeof toForm> | null>(null);

  // Нууц үг
  const [pwMode, setPwMode] = useState<'auto' | 'manual'>('auto');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mustChange, setMustChange] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  useEffect(() => {
    if (!userId) return;
    setTab('basic');
    setPwMode('auto');
    setPw('');
    setShowPw(false);
    setMustChange(true);
  }, [userId]);

  useEffect(() => {
    if (!data) return;
    const f = toForm(data);
    setInitial(f);
    setForm(f);
  }, [data]);

  const isSelf = userId === currentUserId;
  const profileLabel = data?.student ? 'Оюутны мэдээлэл' : data?.employee ? 'Ажилтны мэдээлэл' : null;

  const changes = useMemo<UserUpdateInput>(() => {
    if (!form || !initial) return {};
    const body: UserUpdateInput = diff(form.user, initial.user) as UserUpdateInput;
    const s = diff(form.student, initial.student);
    const e = diff(form.employee, initial.employee);
    if (Object.keys(s).length) body.student = { ...s, ...(s.enrollment_year ? { enrollment_year: Number(s.enrollment_year) } : {}) } as UserUpdateInput['student'];
    if (Object.keys(e).length) body.employee = { ...e, ...(e.department_id === '' ? { department_id: null } : {}) } as UserUpdateInput['employee'];
    return body;
  }, [form, initial]);
  const dirty = Object.keys(changes).length > 0;

  const roleMismatch =
    form && data && ((form.user.role === 'student' && !data.student) || (form.user.role !== 'student' && data.student && form.user.role !== initial?.user.role));

  const set = (section: 'user' | 'student' | 'employee', key: string, value: string | boolean) =>
    setForm((f) => (f ? { ...f, [section]: { ...f[section], [key]: value } } : f));
  const bind = (section: 'user' | 'student' | 'employee', key: string) => ({
    value: String(form?.[section][key] ?? ''),
    onChange: (e: { target: { value: string } }) => set(section, key, e.target.value),
  });

  const onSave = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!userId || !dirty) return;
    try {
      const res = await update.mutateAsync({ id: userId, ...changes });
      toast.success(`Хадгалагдлаа (${res.changed.length} талбар)`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onConfirmEmail = async () => {
    if (!userId) return;
    try {
      await confirm.mutateAsync(userId);
      toast.success('Эрх баталгаажлаа. Хэрэглэгч одоо нэвтрэх боломжтой.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onReset = async () => {
    if (!userId || !data) return;
    try {
      const res = await reset.mutateAsync({ id: userId, password: pwMode === 'manual' ? pw : undefined, must_change: mustChange });
      setConfirmReset(false);
      toast.success('Нууц үг шинэчлэгдлээ');
      setCredentials({
        title: 'Нууц үг шинэчлэгдлээ',
        fullName: data.user.full_name,
        loginIds: [
          ...(data.student ? [{ label: 'Оюутны код', value: data.student.student_code }] : []),
          ...(data.employee ? [{ label: 'Ажилтны код', value: data.employee.employee_code }] : []),
          { label: 'И-мэйл', value: data.user.email ?? '' },
        ],
        password: res.password,
      });
      setPw('');
    } catch (err) {
      setConfirmReset(false);
      toast.error(errorMessage(err));
    }
  };

  const tabs = [
    { value: 'basic' as Tab, label: 'Үндсэн' },
    ...(profileLabel ? [{ value: 'profile' as Tab, label: data?.student ? 'Оюутан' : 'Ажилтан' }] : []),
    { value: 'password' as Tab, label: 'Нууц үг' },
  ];

  return (
    <>
      <Modal
        open={!!userId}
        onClose={onClose}
        size="lg"
        title={data?.user.full_name ?? 'Хэрэглэгч'}
        description={data ? `${data.user.email ?? ''}, ${ROLE_LABEL[data.user.role]}` : undefined}
        footer={
          tab === 'password' ? (
            <Button onClick={onClose}>Хаах</Button>
          ) : (
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-[13px] text-muted">{dirty ? 'Хадгалаагүй өөрчлөлт байна' : ''}</p>
              <div className="flex gap-2">
                <Button onClick={onClose}>Болих</Button>
                <Button variant="primary" onClick={() => onSave()} loading={update.isPending} disabled={!dirty}>
                  Хадгалах
                </Button>
              </div>
            </div>
          )
        }
      >
        {isLoading || !form ? (
          error ? <ErrorState error={error} onRetry={refetch} /> : <PageLoader />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Segmented value={tab} onChange={setTab} options={tabs} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {data?.auth && !data.auth.email_confirmed_at && (
                  <span className="flex items-center gap-1.5">
                    <Badge tone="danger">Эрх баталгаажаагүй</Badge>
                    <Button size="sm" variant="subtle" loading={confirm.isPending} onClick={onConfirmEmail}>
                      Баталгаажуулах
                    </Button>
                  </span>
                )}
                {data?.auth?.must_change_password && <Badge tone="warn">Нууц үг солих шаардлагатай</Badge>}
                <span>Сүүлд нэвтэрсэн: {data?.auth?.last_sign_in_at ? formatDateTime(data.auth.last_sign_in_at) : 'нэвтэрч байгаагүй'}</span>
              </div>
            </div>

            {tab === 'basic' && (
              <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
                <Input label="Овог" required {...bind('user', 'last_name')} />
                <Input label="Нэр" required {...bind('user', 'first_name')} />
                <Input
                  label="И-мэйл (нэвтрэх хаяг)"
                  type="email"
                  required
                  {...bind('user', 'email')}
                  hint={form.user.email !== initial?.user.email ? 'Хадгалахад нэвтрэх хаяг шууд солигдоно' : undefined}
                />
                <Input label="Утас" inputMode="tel" {...bind('user', 'phone')} />
                <Select
                  label="Эрх"
                  disabled={isSelf}
                  hint={isSelf ? 'Өөрийн эрхийг өөрчлөх боломжгүй' : undefined}
                  options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
                  {...bind('user', 'role')}
                />
                <Select
                  label="Төлөв"
                  disabled={isSelf}
                  hint={form.user.status !== 'active' && !isSelf ? 'Идэвхгүй хэрэглэгч системд нэвтэрч чадахгүй' : undefined}
                  options={Object.entries(USER_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                  {...bind('user', 'status')}
                />
                {roleMismatch && (
                  <p className="flex gap-2 rounded-field bg-warn-soft px-3 py-2.5 text-[13px] text-warn sm:col-span-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Сонгосон эрх хэрэглэгчийн профайлтай таарахгүй байна ({data?.student ? 'оюутны профайлтай' : 'оюутны профайлгүй'}). Цэс, хуудас зөв ажиллахгүй байж болзошгүй.
                  </p>
                )}
              </form>
            )}

            {tab === 'profile' && data?.student && (
              <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
                <Input label="Оюутны код" required {...bind('student', 'student_code')} hint="Оюутан энэ кодоор нэвтэрнэ" />
                <Input label="Регистрийн дугаар" {...bind('student', 'register_number')} />
                <Select label="Анги" options={(classes ?? []).map((c) => ({ value: c.id, label: `${c.code}, ${c.program_name}` }))} {...bind('student', 'class_id')} />
                <Input label="Элссэн он" type="number" min={2000} max={2100} {...bind('student', 'enrollment_year')} />
                <Select label="Суралцах төлөв" wrapperClassName="sm:col-span-2" options={Object.entries(STUDENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))} {...bind('student', 'status')} />
              </form>
            )}

            {tab === 'profile' && data?.employee && (
              <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
                <Input label="Ажилтны код" required {...bind('employee', 'employee_code')} />
                <Select label="Ажилтны төрөл" options={Object.entries(EMPLOYEE_TYPE_LABEL).map(([value, label]) => ({ value, label }))} {...bind('employee', 'employee_type')} />
                <Select label="Тэнхим" placeholder="Сонгоогүй" wrapperClassName="sm:col-span-2" options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))} {...bind('employee', 'department_id')} />
                <Input label="Албан тушаал" {...bind('employee', 'position')} />
                <Input label="Эрдмийн зэрэг" {...bind('employee', 'academic_degree')} />
                <Input label="Мэргэшил" wrapperClassName="sm:col-span-2" {...bind('employee', 'specialization')} />
                <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#1E4B8F]" checked={Boolean(form.employee.is_active)} onChange={(e) => set('employee', 'is_active', e.target.checked)} />
                  Ажиллаж байгаа
                </label>
              </form>
            )}

            {tab === 'password' && (
              <div className="flex flex-col gap-4">
                <p className="flex gap-2 rounded-field bg-paper px-3 py-2.5 text-[13px] leading-relaxed text-muted">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                  Нууц үг шифрлэгдсэн (hash) хэлбэрээр хадгалагддаг тул одоогийн нууц үгийг харах боломжгүй. Шинэ нууц үг тавихад хуучин нь шууд хүчингүй болно.
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {(['auto', 'manual'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPwMode(m)}
                      className={cn('rounded-field border px-4 py-3 text-left transition-colors', pwMode === m ? 'border-accent bg-accent-soft/50' : 'border-line hover:border-line-strong')}
                    >
                      <p className="text-sm font-medium text-ink">{m === 'auto' ? 'Автоматаар үүсгэх' : 'Гараар оруулах'}</p>
                      <p className="mt-0.5 text-xs text-muted">{m === 'auto' ? '10 тэмдэгттэй хүчтэй нууц үг' : 'Хэрэглэгчтэй тохирсон нууц үг'}</p>
                    </button>
                  ))}
                </div>

                {pwMode === 'manual' && (
                  <div className="relative">
                    <Input
                      label="Шинэ нууц үг"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      error={pw && pw.length < 8 ? 'Хамгийн багадаа 8 тэмдэгт' : undefined}
                      hint="Хамгийн багадаа 8 тэмдэгт"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-[34px] rounded p-1 text-faint hover:text-ink" aria-label={showPw ? 'Нуух' : 'Харах'}>
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#1E4B8F]" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} />
                  <span>
                    Дараагийн нэвтрэлтэд нууц үгээ солихыг шаардах
                    <span className="block text-xs text-muted">Түр нууц үг гардуулж байгаа бол идэвхтэй байлгахыг зөвлөж байна</span>
                  </span>
                </label>

                <div>
                  <Button
                    variant="primary"
                    icon={<KeyRound className="h-4 w-4" />}
                    onClick={() => setConfirmReset(true)}
                    disabled={pwMode === 'manual' && pw.length < 8}
                  >
                    Нууц үг шинэчлэх
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={onReset}
        loading={reset.isPending}
        tone="danger"
        title="Нууц үг шинэчлэх үү?"
        confirmLabel="Шинэчлэх"
        description={`${data?.user.full_name ?? 'Хэрэглэгч'}-ийн хуучин нууц үг хүчингүй болж, шинэ нууц үгээр нэвтэрнэ. Энэ үйлдэл үйлдлийн түүхэнд бүртгэгдэнэ.`}
      />

      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  );
}
