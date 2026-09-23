import { useEffect, useState, type FormEvent } from 'react';
import { BadgePercent, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, MultiPicker, PageHeader, Panel, Select, Skeleton, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { RULE_KIND_LABEL, useDeleteRule, useDiscountRules, useSaveRule, useToggleRule, type DiscountRule, type RuleKind } from '@/features/finance/automation';
import { usePrograms } from '@/features/programs/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import { errorMessage } from '@/lib/api';
import { cn, formatMoney } from '@/lib/utils';

const empty = { name: '', kind: 'gpa' as RuleKind, valueType: 'percent' as 'percent' | 'amount', value: '', min_gpa: '3.5', program_ids: [] as string[], year_levels: [] as number[], codes: '', stackable: false, is_active: true, note: '' };

/** Хөнгөлөлтийн дүрэм — бөөнөөр нэхэмжлэх үед автоматаар хэрэглэгдэнэ */
export default function DiscountRulesPage() {
  useDocumentTitle('Хөнгөлөлтийн дүрэм');
  const toast = useToast();
  const { can } = useRole();
  const editable = can('finance');
  const { data: rules, isLoading } = useDiscountRules();
  const { data: programs } = usePrograms();
  const save = useSaveRule();
  const toggle = useToggleRule();
  const remove = useDeleteRule();
  const [editing, setEditing] = useState<DiscountRule | 'new' | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<DiscountRule | null>(null);

  useEffect(() => {
    if (editing === 'new') setForm(empty);
    else if (editing)
      setForm({
        name: editing.name,
        kind: editing.kind,
        valueType: editing.percent ? 'percent' : 'amount',
        value: String(editing.percent ?? editing.amount ?? ''),
        min_gpa: String(editing.params.min_gpa ?? '3.5'),
        program_ids: editing.params.program_ids ?? [],
        year_levels: editing.params.year_levels ?? [],
        codes: (editing.params.student_codes ?? []).join('\n'),
        stackable: editing.stackable,
        is_active: editing.is_active,
        note: editing.note ?? '',
      });
  }, [editing]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(form.value);
    const codes = form.codes.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
    try {
      await save.mutateAsync({
        ...(editing && editing !== 'new' ? { id: editing.id } : {}),
        name: form.name.trim(),
        kind: form.kind,
        percent: form.valueType === 'percent' ? value : null,
        amount: form.valueType === 'amount' ? value : null,
        params:
          form.kind === 'gpa' ? { min_gpa: Number(form.min_gpa) }
          : form.kind === 'program' ? { program_ids: form.program_ids }
          : form.kind === 'year_level' ? { year_levels: form.year_levels }
          : { student_codes: codes },
        stackable: form.stackable,
        is_active: form.is_active,
        note: form.note || null,
      });
      toast.success('Дүрэм хадгалагдлаа');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const describe = (r: DiscountRule) => {
    const p = r.params;
    if (r.kind === 'gpa') return `GPA ≥ ${p.min_gpa}`;
    if (r.kind === 'program') return (p.program_ids ?? []).map((id) => programs?.find((x) => x.id === id)?.name ?? '…').join(', ');
    if (r.kind === 'year_level') return `${(p.year_levels ?? []).join(', ')}-р курс`;
    return `${p.student_codes?.length ?? 0} оюутан`;
  };

  return (
    <>
      <PageHeader
        title="Хөнгөлөлтийн дүрэм"
        description='"Бөөнөөр үүсгэх" үед оюутан бүрт автоматаар тооцогдоно. Хуримтлагдахгүй дүрмээс хамгийн их нэг нь, хуримтлагдах дүрмүүд бүгд нэмэгдэнэ.'
        actions={editable && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Дүрэм нэмэх</Button>}
      />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !rules?.length ? (
        <Panel>
          <EmptyState icon={BadgePercent} title="Дүрэм алга" description="Жишээ: GPA 3.5-аас дээш 20%, тамирчдад 30%, 1-р курст 100,000₮." />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((r) => (
            <Panel key={r.id} className={cn(!r.is_active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success-soft text-base font-semibold text-success">
                  {r.percent ? `${r.percent}%` : <BadgePercent className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-[13px] text-muted">{RULE_KIND_LABEL[r.kind]}: {describe(r)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.amount ? <Badge tone="success">−{formatMoney(r.amount)}</Badge> : null}
                    {r.stackable ? <Badge tone="accent">Хуримтлагдана</Badge> : <Badge>Дангаараа</Badge>}
                    {!r.is_active && <Badge tone="warn">Идэвхгүй</Badge>}
                  </div>
                  {r.note && <p className="mt-2 text-[12px] text-muted">{r.note}</p>}
                </div>
                {editable && (
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-1.5 text-[12px] text-muted">
                      <input type="checkbox" checked={r.is_active} onChange={(e) => toggle.mutate({ id: r.id, is_active: e.target.checked })} className="h-4 w-4 accent-[#1E4B8F]" />
                      Идэвхтэй
                    </label>
                    <span className="flex gap-1">
                      <button onClick={() => setEditing(r)} className="rounded p-1.5 text-faint hover:bg-paper hover:text-ink" aria-label="Засах"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(r)} className="rounded p-1.5 text-faint hover:bg-danger-soft hover:text-danger" aria-label="Устгах"><Trash2 className="h-4 w-4" /></button>
                    </span>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Хөнгөлөлтийн дүрэм нэмэх' : 'Дүрэм засах'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button>
            <Button variant="primary" type="submit" form="rule-form" loading={save.isPending}>Хадгалах</Button>
          </>
        }
      >
        <form id="rule-form" onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input label="Нэр" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Онц сурлагын хөнгөлөлт" />
          <Select label="Нөхцөл" value={form.kind} onChange={(e) => set('kind', e.target.value as RuleKind)} options={Object.entries(RULE_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
          {form.kind === 'gpa' && <Input label="Доод голч дүн (GPA)" type="number" step="0.01" min="0" max="4" required value={form.min_gpa} onChange={(e) => set('min_gpa', e.target.value)} />}
          {form.kind === 'program' && <MultiPicker label="Хөтөлбөр" options={(programs ?? []).map((p) => ({ value: p.id, label: p.name }))} value={form.program_ids} onChange={(v) => set('program_ids', v)} />}
          {form.kind === 'year_level' && (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Курс</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((y) => {
                  const on = form.year_levels.includes(y);
                  return (
                    <button key={y} type="button" onClick={() => set('year_levels', on ? form.year_levels.filter((x) => x !== y) : [...form.year_levels, y])} className={cn('h-9 w-11 rounded-field border text-sm', on ? 'border-accent bg-accent text-white' : 'border-line')}>
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {form.kind === 'students' && <Textarea label="Оюутны кодууд" rows={4} value={form.codes} onChange={(e) => set('codes', e.target.value)} placeholder="ST26SE001&#10;ST26SE014 ..." hint="Тамирчин, өнчин, ах дүү гэх мэт тусгай жагсаалт" />}
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <Select label="Төрөл" value={form.valueType} onChange={(e) => set('valueType', e.target.value as 'percent' | 'amount')} options={[{ value: 'percent', label: 'Хувь (%)' }, { value: 'amount', label: 'Дүн (₮)' }]} />
            <Input label={form.valueType === 'percent' ? 'Хувь' : 'Дүн'} type="number" required min="1" max={form.valueType === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => set('value', e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-[13px]">
            <input type="checkbox" checked={form.stackable} onChange={(e) => set('stackable', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1E4B8F]" />
            <span>
              Бусад хөнгөлөлттэй хуримтлагдана
              <span className="block text-muted">Чагтлаагүй бол зөвхөн хамгийн их хөнгөлөлт үйлчилнэ</span>
            </span>
          </label>
          <Textarea label="Тэмдэглэл" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Захирлын тушаал А/123" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); toast.success('Устгагдлаа'); }, onError: (e) => toast.error(errorMessage(e)) })}
        loading={remove.isPending}
        tone="danger"
        title="Дүрэм устгах уу?"
        description="Үүсгэсэн нэхэмжлэлүүдийн хөнгөлөлт өөрчлөгдөхгүй. Цаашид хэрэглэгдэхгүй болно."
        confirmLabel="Устгах"
      />
    </>
  );
}
