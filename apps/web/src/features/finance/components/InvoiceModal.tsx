import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Modal, SearchInput, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useSemesters } from '@/features/semesters/hooks';
import { useStudents } from '@/features/students/hooks';
import { useFormState } from '@/hooks/useFormState';
import { errorMessage } from '@/lib/api';
import { cn, formatMoney } from '@/lib/utils';
import type { Invoice, InvoiceStatus } from '@/types/models';
import { useSaveInvoice } from '../hooks';

const empty = { student_id: '', semester_id: '', tuition_amount: '4500000', discount_amount: '0', discount_note: '', due_date: '2026-10-15', description: '', status: 'pending' };

/** invoice = null → шинэ, объект → хөнгөлөлт/цуцлалт засах */
export function InvoiceModal({ open, invoice, onClose }: { open: boolean; invoice: Invoice | null; onClose: () => void }) {
  const toast = useToast();
  const save = useSaveInvoice();
  const { data: semesters } = useSemesters();
  const [q, setQ] = useState('');
  const { data: students } = useStudents({ q });
  const { values, bind, set, reset } = useFormState(empty);

  useEffect(() => {
    if (!open) return;
    setQ('');
    reset(invoice
      ? { ...empty, student_id: invoice.student_id, semester_id: invoice.semester_id ?? '', tuition_amount: String(invoice.tuition_amount), discount_amount: String(invoice.discount_amount), discount_note: invoice.discount_note ?? '', due_date: invoice.due_date ?? '', description: invoice.description ?? '', status: invoice.status }
      : { ...empty, semester_id: semesters?.find((s) => s.is_current)?.id ?? '' });
  }, [open, invoice, reset, semesters]);

  const net = Number(values.tuition_amount || 0) - Number(values.discount_amount || 0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoice && !values.student_id) return toast.error('Оюутан сонгоно уу.');
    try {
      if (invoice) {
        await save.mutateAsync({ id: invoice.id, discount_amount: Number(values.discount_amount), discount_note: values.discount_note || null, due_date: values.due_date || null, status: values.status === 'cancelled' ? 'cancelled' : invoice.status === 'cancelled' ? 'pending' : undefined } as Partial<Invoice> & { id: string });
        toast.success('Нэхэмжлэл шинэчлэгдлээ');
      } else {
        await save.mutateAsync({ ...(values as unknown as Partial<Invoice>), tuition_amount: Number(values.tuition_amount), discount_amount: Number(values.discount_amount), status: undefined });
        toast.success('Нэхэмжлэл үүслээ');
      }
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? 'Нэхэмжлэл засах' : 'Нэхэмжлэл үүсгэх'}
      description={invoice ? `${invoice.student_name}, ${invoice.invoice_number}` : undefined}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[13px] text-muted">Төлөх дүн <span className="num ml-1 font-semibold text-ink">{formatMoney(Math.max(0, net))}</span></p>
          <div className="flex gap-2">
            <Button onClick={onClose}>Болих</Button>
            <Button variant="primary" type="submit" form="inv-form" loading={save.isPending}>Хадгалах</Button>
          </div>
        </div>
      }
    >
      <form id="inv-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {!invoice && (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Оюутан <span className="text-danger">*</span></p>
            <SearchInput value={q} onChange={setQ} placeholder="Нэр эсвэл оюутны код" className="sm:w-full" />
            {q && (
              <ul className="mt-2 max-h-44 overflow-y-auto rounded-field border border-line">
                {students?.slice(0, 20).map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => set('student_id', s.id)} className={cn('flex w-full justify-between gap-3 px-3 py-2 text-left text-[13px] hover:bg-paper', values.student_id === s.id && 'bg-accent-soft')}>
                      <span className="font-medium text-ink">{s.full_name}</span>
                      <span className="text-muted">{s.student_code}, {s.class_name}</span>
                    </button>
                  </li>
                ))}
                {!students?.length && <li className="px-3 py-2 text-[13px] text-muted">Олдсонгүй</li>}
              </ul>
            )}
          </div>
        )}
        {!invoice && <Select label="Улирал" options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))} {...bind('semester_id')} />}
        {!invoice && <Input label="Сургалтын төлбөр (₮)" type="number" min={0} required {...bind('tuition_amount')} />}
        <Input label="Хөнгөлөлт (₮)" type="number" min={0} {...bind('discount_amount')} />
        <Input label="Хөнгөлөлтийн шалтгаан" placeholder="Сурлагын тэтгэлэг" {...bind('discount_note')} />
        <Input label="Төлөх хугацаа" type="date" {...bind('due_date')} />
        {invoice && (
          <Select label="Нэхэмжлэл" options={[{ value: invoice.status === 'cancelled' ? 'pending' : invoice.status, label: 'Хүчинтэй' }, { value: 'cancelled', label: 'Цуцлах' }]} value={values.status === 'cancelled' ? 'cancelled' : invoice.status === 'cancelled' ? 'pending' : invoice.status} onChange={(e) => set('status', e.target.value as InvoiceStatus)} />
        )}
      </form>
    </Modal>
  );
}
