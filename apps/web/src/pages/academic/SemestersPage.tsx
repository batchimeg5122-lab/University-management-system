import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DataTable, Input, Modal, PageHeader, Panel, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateSemester, useSemesters, useSetCurrentSemester } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Semester } from '@/types/models';

const empty = { academic_year: '2027-2028', name: 'Намрын улирал', semester_number: '1', start_date: '', end_date: '' };

export default function SemestersPage() {
  useDocumentTitle('Улирал');
  const toast = useToast();
  const { can } = useRole();
  const { data, isLoading, error, refetch } = useSemesters();
  const create = useCreateSemester();
  const setCurrent = useSetCurrentSemester();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Semester | null>(null);
  const { values, bind, reset } = useFormState(empty);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ ...values, semester_number: Number(values.semester_number) });
      toast.success('Улирал нэмэгдлээ');
      setOpen(false);
      reset(empty);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Хичээлийн жил, улирал"
        description="Одоогийн улирлыг солиход бүх хэрэглэгчийн хуваарь, хичээл, нэхэмжлэлийн анхдагч улирал өөрчлөгдөнө."
        actions={can('structure') && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Улирал нэмэх</Button>}
      />
      <Panel flush>
        <DataTable
          rows={data}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          rowKey={(r) => r.id}
          columns={[
            { key: 'year', header: 'Хичээлийн жил', cell: (r) => <span className="num font-medium">{r.academic_year}</span> },
            { key: 'name', header: 'Улирал', cell: (r) => r.name },
            { key: 'range', header: 'Хугацаа', hideOnMobile: true, cell: (r) => <span className="num text-muted">{formatDate(r.start_date)} – {formatDate(r.end_date)}</span> },
            {
              key: 'current', header: '', align: 'right',
              cell: (r) => r.is_current
                ? <Badge tone="gold" dot>Одоогийн улирал</Badge>
                : can('structure') ? <Button size="sm" variant="ghost" onClick={() => setTarget(r)}>Одоогийн болгох</Button> : null,
            },
          ]}
        />
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Улирал нэмэх" size="sm" footer={<><Button onClick={() => setOpen(false)}>Болих</Button><Button variant="primary" type="submit" form="sem-form" loading={create.isPending}>Нэмэх</Button></>}>
        <form id="sem-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Хичээлийн жил" required placeholder="2027-2028" {...bind('academic_year')} />
          <Select label="Улирал" options={[{ value: '1', label: '1-р улирал' }, { value: '2', label: '2-р улирал' }]} {...bind('semester_number')} />
          <Input label="Нэр" required wrapperClassName="sm:col-span-2" {...bind('name')} />
          <Input label="Эхлэх огноо" type="date" required {...bind('start_date')} />
          <Input label="Дуусах огноо" type="date" required {...bind('end_date')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={async () => {
          try {
            await setCurrent.mutateAsync(target!.id);
            toast.success('Одоогийн улирал солигдлоо');
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setTarget(null);
        }}
        loading={setCurrent.isPending}
        title="Одоогийн улирлыг солих уу?"
        confirmLabel="Солих"
        description={target && `${target.academic_year} оны ${target.name.toLowerCase()} одоогийн улирал болно.`}
      />
    </>
  );
}
