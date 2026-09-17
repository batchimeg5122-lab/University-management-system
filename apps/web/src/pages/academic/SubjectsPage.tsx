import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Badge, Button, DataTable, Input, Modal, PageHeader, Panel, SearchInput, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDepartments } from '@/features/departments/hooks';
import { useSaveSubject, useSubjects } from '@/features/subjects/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { SUBJECT_TYPE_LABEL } from '@/lib/constants';
import type { Subject } from '@/types/models';

const empty = { code: '', name: '', credit: '3', department_id: '', subject_type: 'mandatory', description: '' };

export default function SubjectsPage() {
  useDocumentTitle('Хичээлийн сан');
  const toast = useToast();
  const { can } = useRole();
  const [q, setQ] = useState('');
  const [dep, setDep] = useState('');
  const { data, isLoading, error, refetch } = useSubjects({ q, department_id: dep });
  const { data: departments } = useDepartments({ level: 'department' });
  const save = useSaveSubject();
  const [editing, setEditing] = useState<Subject | 'new' | null>(null);
  const { values, bind, reset } = useFormState(empty);

  useEffect(() => {
    if (editing === 'new') reset(empty);
    else if (editing) reset({ code: editing.code, name: editing.name, credit: String(editing.credit), department_id: editing.department_id ?? '', subject_type: editing.subject_type, description: editing.description ?? '' });
  }, [editing, reset]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ ...(values as unknown as Partial<Subject>), credit: Number(values.credit), id: editing && editing !== 'new' ? editing.id : undefined });
      toast.success('Хичээл хадгалагдлаа');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Хичээлийн сан"
        description="Сургуулийн хэмжээнд заагддаг хичээлүүд. Улирал бүр эндээс ангид хуваарилна."
        actions={can('courses') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Хичээл нэмэх</Button>}
      />
      <Panel flush>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Код эсвэл нэр" />
          <Select className="sm:w-64" value={dep} onChange={(e) => setDep(e.target.value)} placeholder="Бүх тэнхим" options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={can('courses') ? (r) => setEditing(r) : undefined}
          empty={{ icon: BookOpen, title: 'Хичээл олдсонгүй' }}
          columns={[
            { key: 'code', header: 'Код', cell: (r) => <span className="num font-medium">{r.code}</span> },
            { key: 'name', header: 'Нэр', cell: (r) => r.name },
            { key: 'dep', header: 'Тэнхим', hideOnMobile: true, cell: (r) => <span className="text-muted">{r.department_name ?? '—'}</span> },
            { key: 'type', header: 'Төрөл', cell: (r) => <Badge tone={r.subject_type === 'elective' ? 'gold' : 'neutral'}>{SUBJECT_TYPE_LABEL[r.subject_type]}</Badge> },
            { key: 'credit', header: 'Кредит', align: 'right', cell: (r) => <span className="num">{r.credit}</span> },
          ]}
        />
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Хичээл нэмэх' : 'Хичээл засах'}
        footer={<><Button onClick={() => setEditing(null)}>Болих</Button><Button variant="primary" type="submit" form="subject-form" loading={save.isPending}>Хадгалах</Button></>}
      >
        <form id="subject-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Код" required placeholder="CS101" {...bind('code')} disabled={editing !== 'new'} />
          <Input label="Кредит" type="number" min={1} max={10} required {...bind('credit')} />
          <Input label="Хичээлийн нэр" required wrapperClassName="sm:col-span-2" {...bind('name')} />
          <Select label="Тэнхим" placeholder="Сонгоогүй" options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))} {...bind('department_id')} />
          <Select label="Төрөл" options={Object.entries(SUBJECT_TYPE_LABEL).map(([value, label]) => ({ value, label }))} {...bind('subject_type')} />
          <Textarea label="Тайлбар" wrapperClassName="sm:col-span-2" {...bind('description')} />
        </form>
      </Modal>
    </>
  );
}
