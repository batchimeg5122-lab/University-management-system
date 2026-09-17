import { useEffect, useState, type FormEvent } from 'react';
import { Plus, School } from 'lucide-react';
import { Button, DataTable, Input, Modal, PageHeader, Panel, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDepartments } from '@/features/departments/hooks';
import { usePrograms, useSaveProgram } from '@/features/programs/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { errorMessage } from '@/lib/api';
import type { Program } from '@/types/models';

const empty = { name: '', code: '', department_id: '', degree: 'Бакалавр', duration_years: '4', total_credits: '130' };

export default function ProgramsPage() {
  useDocumentTitle('Хөтөлбөр');
  const toast = useToast();
  const { data, isLoading, error, refetch } = usePrograms();
  const { data: departments } = useDepartments({ level: 'department' });
  const save = useSaveProgram();
  const [editing, setEditing] = useState<Program | 'new' | null>(null);
  const { values, bind, reset } = useFormState(empty);

  useEffect(() => {
    if (editing === 'new') reset(empty);
    else if (editing) reset({ name: editing.name, code: editing.code ?? '', department_id: editing.department_id, degree: editing.degree ?? '', duration_years: String(editing.duration_years ?? ''), total_credits: String(editing.total_credits ?? '') });
  }, [editing, reset]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ ...values, duration_years: Number(values.duration_years), total_credits: Number(values.total_credits), id: editing && editing !== 'new' ? editing.id : undefined });
      toast.success('Хөтөлбөр хадгалагдлаа');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Сургалтын хөтөлбөр" description="Тэнхим бүрийн мэргэжлийн хөтөлбөр, зэрэг, кредит." actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Хөтөлбөр нэмэх</Button>} />
      <Panel flush>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={(r) => setEditing(r)}
          empty={{ icon: School, title: 'Хөтөлбөр алга' }}
          columns={[
            { key: 'code', header: 'Код', cell: (r) => <span className="num font-medium">{r.code}</span> },
            { key: 'name', header: 'Хөтөлбөр', cell: (r) => r.name },
            { key: 'dep', header: 'Тэнхим', hideOnMobile: true, cell: (r) => <span className="text-muted">{r.department_name}</span> },
            { key: 'degree', header: 'Зэрэг', cell: (r) => r.degree },
            { key: 'years', header: 'Жил', align: 'right', hideOnMobile: true, cell: (r) => <span className="num">{r.duration_years}</span> },
            { key: 'credits', header: 'Кредит', align: 'right', cell: (r) => <span className="num">{r.total_credits}</span> },
          ]}
        />
      </Panel>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Хөтөлбөр нэмэх' : 'Хөтөлбөр засах'} footer={<><Button onClick={() => setEditing(null)}>Болих</Button><Button variant="primary" type="submit" form="prg-form" loading={save.isPending}>Хадгалах</Button></>}>
        <form id="prg-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Нэр" required wrapperClassName="sm:col-span-2" {...bind('name')} />
          <Input label="Код" {...bind('code')} />
          <Select label="Тэнхим" required placeholder="Сонгох" options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))} {...bind('department_id')} />
          <Select label="Зэрэг" options={['Диплом', 'Бакалавр', 'Магистр', 'Доктор'].map((v) => ({ value: v, label: v }))} {...bind('degree')} />
          <Input label="Суралцах жил" type="number" min={1} max={8} {...bind('duration_years')} />
          <Input label="Нийт кредит" type="number" min={1} {...bind('total_credits')} />
        </form>
      </Modal>
    </>
  );
}
