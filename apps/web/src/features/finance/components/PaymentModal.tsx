import { useEffect, type FormEvent } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useFormState } from '@/hooks/useFormState';
import { errorMessage } from '@/lib/api';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { formatMoney, toISODate } from '@/lib/utils';
import type { Invoice, PaymentMethod } from '@/types/models';
import { useRecordPayment } from '../hooks';

export function PaymentModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const toast = useToast();
  const record = useRecordPayment();
  const balance = invoice ? Math.max(0, invoice.net_amount - invoice.paid_amount) : 0;
  const { values, bind, reset } = useFormState({ amount: '', method: 'qpay', transaction_reference: '', payment_date: toISODate(new Date()) });

  useEffect(() => {
    if (invoice) reset({ amount: String(balance), method: 'qpay', transaction_reference: '', payment_date: toISODate(new Date()) });
  }, [invoice, balance, reset]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await record.mutateAsync({ invoice_id: invoice!.id, amount: Number(values.amount), method: values.method as PaymentMethod, transaction_reference: values.transaction_reference, payment_date: values.payment_date });
      toast.success(`${formatMoney(Number(values.amount))} төлөлт бүртгэгдлээ`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      size="sm"
      title="Төлөлт бүртгэх"
      description={invoice ? `${invoice.student_name}, ${invoice.invoice_number}` : undefined}
      footer={<><Button onClick={onClose}>Болих</Button><Button variant="primary" type="submit" form="pay-form" loading={record.isPending}>Бүртгэх</Button></>}
    >
      {invoice && (
        <div className="mb-5 grid grid-cols-3 rounded-field bg-paper text-center text-[13px]">
          {[['Төлөх', invoice.net_amount], ['Төлсөн', invoice.paid_amount], ['Үлдэгдэл', balance]].map(([k, v]) => (
            <div key={k as string} className="py-2.5">
              <p className="text-faint">{k}</p>
              <p className="num mt-0.5 font-semibold text-ink">{formatMoney(v as number)}</p>
            </div>
          ))}
        </div>
      )}
      <form id="pay-form" onSubmit={onSubmit} className="grid gap-4">
        <Input label="Дүн (₮)" type="number" min={1} required {...bind('amount')} hint={Number(values.amount) > balance ? 'Үлдэгдлээс их дүн оруулсан байна' : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Төлбөрийн хэлбэр" options={Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({ value, label }))} {...bind('method')} />
          <Input label="Огноо" type="date" required {...bind('payment_date')} />
        </div>
        <Input label="Гүйлгээний дугаар" placeholder="TX12345678" {...bind('transaction_reference')} />
      </form>
    </Modal>
  );
}
