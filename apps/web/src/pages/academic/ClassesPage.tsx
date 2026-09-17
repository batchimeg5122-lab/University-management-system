import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button, DataTable, Input, Modal, PageHeader, Panel, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClasses, useSaveClass } from '@/features/classes/hooks';
import { useTeachers } from '@/features/employees/hooks';
import { usePrograms } from '@/features/programs/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { shortName } from '@/lib/utils';
import type { ClassGroup } from '@/types/models';

const empty = { code: '', name: '', program_id: '', year_level: '1', advisor_id: '' };

export default function ClassesPage() {
  useDocumentTitle('Анги');
  const toast = useToast();
  const { can } = useRole();
  const [program, setProgram] = useState('');
  const { data, isLoading, error, refetch } = useClasses({ program_id: program });
  const { data: programs } = usePrograms();
  const { data: teachers } = useTeachers();
  const save = useSaveClass();
  const [editing, setEditing] = useState<ClassGroup | 'new' | null>(null);
  const { values, bind, reset } = useFormState(empty);

  useEffect(() => {
    if (editing === 'new') reset(empty);
    else if (editing) reset({ code: editing.code, name: editing.name, program_id: editing.program_id, year_level: String(editing.year_level), advisor_id: editing.advisor_id ?? '' });
  }, [editing, reset]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ ...values, year_level: Number(values.year_level), advisor_id: values.advisor_id || null, id: editing && editing !== 'new' ? editing.id : undefined });
      toast.success('Анги хадгалагдлаа');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Анги"
        description="Хөтөлбөр тус бүрийн анги, курс, ангийн багш."
        actions={can('structure') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Анги нэмэх</Button>}
      />
      <Panel flush>
        <div className="flex gap-2 border-b border-line px-4 py-3">
          <Select className="sm:w-72" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Бүх хөтөлбөр" options={(programs ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          onRowClick={can('structure') ? (r) => setEditing(r) : undefined}
          empty={{ icon: Users, title: 'Анги бүртгэгдээгүй байна' }}
          columns={[
            { key: 'code', header: 'Анги', cell: (r) => <span className="font-semibold">{r.code}</span> },
            { key: 'program', header: 'Хөтөлбөр', cell: (r) => <span className="text-muted">{r.program_name}</span> },
            { key: 'year', header: 'Курс', align: 'center', cell: (r) => <span className="num">{r.year_level}</span> },
            { key: 'advisor', header: 'Ангийн багш', hideOnMobile: true, cell: (r) => shortName(r.advisor_name) },
            { key: 'count', header: 'Оюутан', align: 'right', cell: (r) => <span className="num">{r.student_count}</span> },
          ]}
        />
      </Panel>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Анги нэмэх' : 'Анги засах'}
        size="sm"
        footer={<><Button onClick={() => setEditing(null)}>Болих</Button><Button variant="primary" type="submit" form="class-form" loading={save.isPending}>Хадгалах</Button></>}
      >
        <form id="class-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Ангийн код" required placeholder="SE-1A" {...bind('code')} />
          <Input label="Курс" type="number" min={1} max={6} required {...bind('year_level')} />
          <Select label="Хөтөлбөр" required placeholder="Сонгох" wrapperClassName="sm:col-span-2" options={(programs ?? []).map((p) => ({ value: p.id, label: p.name }))} {...bind('program_id')} />
          <Select label="Ангийн багш" placeholder="Сонгоогүй" wrapperClassName="sm:col-span-2" options={(teachers ?? []).map((t) => ({ value: t.id, label: t.full_name }))} {...bind('advisor_id')} />
        </form>
      </Modal>
    </>
  );
}
