import { useEffect, useState, type FormEvent } from 'react';
import { Plus, UserSquare2 } from 'lucide-react';
import { Button, DataTable, Input, Modal, PageHeader, Panel, SearchInput, Select } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useDepartments } from '@/features/departments/hooks';
import { useEmployees, useSaveEmployee } from '@/features/employees/hooks';
import { CredentialsDialog, type Credentials } from '@/features/users/components/CredentialsDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { EMPLOYEE_TYPE_LABEL } from '@/lib/constants';
import type { EmployeeView } from '@/types/models';

const empty = { last_name: '', first_name: '', employee_code: '', employee_type: 'teacher', department_id: '', position: 'Багш', specialization: '', academic_degree: '', email: '', phone: '', password: '' };

export default function TeachersPage() {
  useDocumentTitle('Багш');
  const toast = useToast();
  const { can } = useRole();
  const [q, setQ] = useState('');
  const [type, setType] = useState('teacher');
  const [department, setDepartment] = useState('');
  const { data, isLoading, error, refetch } = useEmployees({ q, type, department_id: department });
  const { data: departments } = useDepartments({ level: 'department' });
  const save = useSaveEmployee();
  const [editing, setEditing] = useState<EmployeeView | 'new' | null>(null);
  const { values, bind, reset } = useFormState(empty);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  useEffect(() => {
    if (editing === 'new') reset(empty);
    else if (editing) reset({ ...empty, ...Object.fromEntries(Object.entries(editing).map(([k, v]) => [k, v ?? ''])) } as typeof empty);
  }, [editing, reset]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const body = editing && editing !== 'new'
        ? { id: editing.id, department_id: values.department_id || null, position: values.position, specialization: values.specialization, academic_degree: values.academic_degree }
        : (values as unknown as Partial<EmployeeView>);
      const saved = await save.mutateAsync(body as Partial<EmployeeView> & { id?: string; password?: string });
      toast.success(editing === 'new' ? 'Ажилтан бүртгэгдлээ' : 'Мэдээлэл шинэчлэгдлээ');
      if (editing === 'new') {
        setCredentials({
          fullName: saved.full_name,
          loginIds: [{ label: 'Ажилтны код', value: saved.employee_code }, ...(saved.email ? [{ label: 'И-мэйл', value: saved.email }] : [])],
          password: saved.initial_password ?? null,
        });
      }
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Багш, ажилтан"
        description="Багш нарын бүртгэл, харьяалах тэнхим, мэргэшил."
        actions={can('teachers') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Ажилтан бүртгэх</Button>}
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Нэр, ажилтны код" />
          <Select className="sm:w-44" value={type} onChange={(e) => setType(e.target.value)} placeholder="Бүх төрөл" options={Object.entries(EMPLOYEE_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          <Select className="sm:w-60" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Бүх тэнхим" options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={can('teachers') ? (r) => setEditing(r) : undefined}
          empty={{ icon: UserSquare2, title: 'Ажилтан олдсонгүй' }}
          columns={[
            { key: 'code', header: 'Код', cell: (r) => <span className="num text-muted">{r.employee_code}</span> },
            { key: 'name', header: 'Овог нэр', cell: (r) => <div><p className="font-medium">{r.full_name}</p><p className="text-xs text-faint">{r.email}</p></div> },
            { key: 'dep', header: 'Тэнхим', hideOnMobile: true, cell: (r) => <span className="text-muted">{r.department_name ?? '—'}</span> },
            { key: 'spec', header: 'Мэргэшил', hideOnMobile: true, cell: (r) => r.specialization ?? '—' },
            { key: 'degree', header: 'Зэрэг', hideOnMobile: true, cell: (r) => r.academic_degree ?? '—' },
            { key: 'pos', header: 'Албан тушаал', align: 'right', cell: (r) => <Badge tone={r.position?.startsWith('Ахлах') ? 'accent' : 'neutral'}>{r.position ?? EMPLOYEE_TYPE_LABEL[r.employee_type]}</Badge> },
          ]}
        />
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Ажилтан бүртгэх' : 'Ажилтны мэдээлэл'}
        description={editing && editing !== 'new' ? editing.full_name : undefined}
        footer={<><Button onClick={() => setEditing(null)}>Болих</Button><Button variant="primary" type="submit" form="emp-form" loading={save.isPending}>Хадгалах</Button></>}
      >
        <form id="emp-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {editing === 'new' && (
            <>
              <Input label="Овог" required {...bind('last_name')} />
              <Input label="Нэр" required {...bind('first_name')} />
              <Input label="Ажилтны код" required placeholder="EMP0100" {...bind('employee_code')} />
              <Select label="Төрөл" options={Object.entries(EMPLOYEE_TYPE_LABEL).map(([value, label]) => ({ value, label }))} {...bind('employee_type')} />
              <Input label="И-мэйл" type="email" required {...bind('email')} />
              <Input label="Утас" {...bind('phone')} />
              <Input label="Анхны нууц үг" type="text" autoComplete="new-password" wrapperClassName="sm:col-span-2" placeholder="Хоосон бол автоматаар үүснэ" {...bind('password')} />
            </>
          )}
          <Select label="Тэнхим" placeholder="Сонгоогүй" wrapperClassName="sm:col-span-2" options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))} {...bind('department_id')} />
          <Input label="Албан тушаал" {...bind('position')} />
          <Input label="Эрдмийн зэрэг" placeholder="Магистр" {...bind('academic_degree')} />
          <Input label="Мэргэшил" wrapperClassName="sm:col-span-2" {...bind('specialization')} />
        </form>
      </Modal>
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  );
}
