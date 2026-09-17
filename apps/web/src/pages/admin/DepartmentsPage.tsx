import { useState, type FormEvent } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Badge, Button, ErrorState, Input, Modal, PageHeader, PageLoader, Panel, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDepartments, useSaveDepartment } from '@/features/departments/hooks';
import { usePrograms } from '@/features/programs/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { errorMessage } from '@/lib/api';
import { DEPARTMENT_LEVEL_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Department, DepartmentLevel } from '@/types/models';

const empty = { name: '', code: '', level: 'department', parent_id: '', head_name: '' };

export default function DepartmentsPage() {
  useDocumentTitle('Бүтэц');
  const toast = useToast();
  const { data, isLoading, error, refetch } = useDepartments();
  const { data: programs } = usePrograms();
  const save = useSaveDepartment();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { values, bind, reset } = useFormState(empty);

  const children = (id: string | null) => (data ?? []).filter((d) => d.parent_id === id);
  const parentLevel: Record<DepartmentLevel, DepartmentLevel | null> = { campus: null, school: 'campus', department: 'school' };
  const parents = (data ?? []).filter((d) => d.level === parentLevel[values.level as DepartmentLevel]);

  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save.mutateAsync({ ...values, level: values.level as DepartmentLevel, parent_id: values.parent_id || null });
      toast.success('Нэгж нэмэгдлээ');
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const Node = ({ d, depth }: { d: Department; depth: number }) => {
    const kids = children(d.id);
    const isOpen = !collapsed.has(d.id);
    const programCount = programs?.filter((p) => p.department_id === d.id).length ?? 0;
    return (
      <li>
        <div className={cn('flex items-center gap-2 border-b border-line py-2.5 pr-5', depth === 0 && 'bg-paper/60')} style={{ paddingLeft: 20 + depth * 24 }}>
          {kids.length ? (
            <button onClick={() => toggle(d.id)} className="rounded p-0.5 text-faint hover:text-ink" aria-label={isOpen ? 'Хураах' : 'Дэлгэх'}>
              <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
            </button>
          ) : <span className="w-5" />}
          <span className={cn('min-w-0 flex-1 truncate text-sm', depth < 2 ? 'font-semibold text-ink' : 'text-ink')}>{d.name}</span>
          {d.code && <span className="num hidden text-xs text-faint sm:inline">{d.code}</span>}
          {d.level === 'department' && <span className="num w-20 text-right text-xs text-muted">{programCount} хөтөлбөр</span>}
          {d.level !== 'department' && <Badge tone={d.level === 'campus' ? 'gold' : 'accent'}>{DEPARTMENT_LEVEL_LABEL[d.level]}</Badge>}
        </div>
        {kids.length > 0 && isOpen && <ul>{kids.map((k) => <Node key={k.id} d={k} depth={depth + 1} />)}</ul>}
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Байгууллагын бүтэц"
        description="Цогцолбор, сургууль, тэнхимийн шаталсан бүтэц."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { reset(empty); setOpen(true); }}>Нэгж нэмэх</Button>}
      />
      <Panel flush>
        {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
          <ul className="-mb-px">{children(null).map((d) => <Node key={d.id} d={d} depth={0} />)}</ul>
        )}
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Нэгж нэмэх" size="sm" footer={<><Button onClick={() => setOpen(false)}>Болих</Button><Button variant="primary" type="submit" form="dep-form" loading={save.isPending}>Нэмэх</Button></>}>
        <form id="dep-form" onSubmit={onSubmit} className="grid gap-4">
          <Select label="Түвшин" options={Object.entries(DEPARTMENT_LEVEL_LABEL).map(([value, label]) => ({ value, label }))} {...bind('level')} />
          {values.level !== 'campus' && <Select label="Харьяалах нэгж" required placeholder="Сонгох" options={parents.map((p) => ({ value: p.id, label: p.name }))} {...bind('parent_id')} />}
          <Input label="Нэр" required {...bind('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Код" placeholder="NET-SE" {...bind('code')} />
            <Input label="Удирдагч" {...bind('head_name')} />
          </div>
        </form>
      </Modal>
    </>
  );
}
