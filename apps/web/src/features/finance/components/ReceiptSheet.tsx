import { forwardRef } from 'react';
import { BRAND } from '@/lib/brand';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';
import type { PaymentMethod } from '@/types/models';
import type { PaymentReceipt } from '../api';

/**
 * Төлбөр төлсөн баримт — A4, хэвлэх / PDF болгон татах.
 * Дүнг тоо болон үгээр (серверээс) хоёуланг харуулна.
 */
export const ReceiptSheet = forwardRef<HTMLDivElement, { receipt: PaymentReceipt }>(({ receipt: r }, ref) => {
  const org = r.organization;
  const rows: [string, string | null][] = [
    ['Овог нэр', r.student.name],
    ['Оюутны код', r.student.code],
    ['Анги', r.student.class_name],
    ['Хөтөлбөр', r.student.program_name],
    ['Нэхэмжлэл', r.invoice.number],
    ['Улирал', r.invoice.semester],
  ];

  const amounts: [string, string, boolean?][] = [
    ['Нэхэмжилсэн дүн', formatMoney(r.invoice.tuition_amount)],
    ...(r.invoice.discount_amount ? ([['Хөнгөлөлт', `−${formatMoney(r.invoice.discount_amount)}`]] as [string, string][]) : []),
    ['Төлбөл зохих', formatMoney(r.invoice.net_amount)],
    ['Одоогийн байдлаар төлсөн', formatMoney(r.invoice.paid_amount)],
    ['Үлдэгдэл', formatMoney(r.invoice.balance), true],
  ];

  return (
    <div ref={ref} className="w-[794px] bg-white px-10 py-9 text-[12px] text-ink">
      <header className="flex items-start justify-between gap-6 border-b-2 border-accent pb-4">
        <div className="flex items-center gap-3">
          <img src={BRAND.logo} alt="" className="h-14 w-14 object-contain" crossOrigin="anonymous" />
          <div>
            <p className="text-[16px] font-semibold leading-tight">{org.name}</p>
            <p className="text-muted">Санхүүгийн хэлтэс</p>
            {(org.phone || org.email) && (
              <p className="text-[11px] text-faint">{[org.phone, org.email].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>
        <div className="text-right leading-relaxed text-muted">
          <p className="num">Баримтын дугаар: {r.receipt_no ?? '—'}</p>
          <p className="num">Төлсөн: {formatDateTime(r.payment_date)}</p>
          <p className="num">Хэвлэсэн: {formatDate(new Date())}</p>
        </div>
      </header>

      <h1 className="mt-6 text-center text-[19px] font-semibold tracking-wide">ТӨЛБӨР ТӨЛСӨН БАРИМТ</h1>
      <p className="mt-1 text-center text-muted">Сургалтын төлбөрийн төлөлтийг хүлээн авсныг баталж байна.</p>

      <table className="mt-6 w-full border-collapse">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-line/70">
              <th scope="row" className="w-[190px] py-1.5 pr-4 text-left font-medium text-muted">
                {label}
              </th>
              <td className="py-1.5 font-medium">{value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 rounded-md border-2 border-accent/40 bg-accent-soft/30 px-5 py-4">
        <p className="text-muted">Хүлээн авсан дүн</p>
        <p className="num mt-0.5 text-[26px] font-bold leading-none text-accent-ink">{formatMoney(r.amount)}</p>
        <p className="mt-2 text-[12.5px]">
          Үгээр: <span className="font-medium">{r.amount_words}</span>
        </p>
        <p className="mt-2 text-muted">
          Төлсөн хэлбэр: <span className="font-medium text-ink">{PAYMENT_METHOD_LABEL[r.method as PaymentMethod] ?? r.method}</span>
          {r.transaction_reference ? (
            <>
              {' · '}Гүйлгээний дугаар: <span className="num font-medium text-ink">{r.transaction_reference}</span>
            </>
          ) : null}
        </p>
        {r.description ? <p className="mt-1 text-muted">Тайлбар: {r.description}</p> : null}
      </div>

      <table className="mt-6 w-full border-collapse text-[12px]">
        <tbody>
          {amounts.map(([label, value, strong]) => (
            <tr key={label} className="border-b border-line/70">
              <th scope="row" className="py-1.5 pr-4 text-left font-medium text-muted">
                {label}
              </th>
              <td className={`num py-1.5 text-right ${strong ? 'text-[14px] font-bold' : 'font-medium'}`}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {r.invoice.balance > 0 && (
        <p className="mt-3 rounded-md bg-warn-soft px-4 py-2 text-[12px]">
          Нэхэмжлэлийн үлдэгдэл <span className="num font-semibold">{formatMoney(r.invoice.balance)}</span> байна
          {r.invoice.due_date ? ` (төлөх хугацаа ${formatDate(r.invoice.due_date)})` : ''}.
        </p>
      )}

      <div className="mt-12 flex items-end justify-between gap-10">
        <div className="flex-1">
          <div className="border-b border-ink/60 pb-8" />
          <p className="mt-1.5 text-center text-muted">Төлбөр хүлээн авсан (нэр, гарын үсэг)</p>
        </div>
        <div className="flex-1">
          <div className="border-b border-ink/60 pb-8" />
          <p className="mt-1.5 text-center text-muted">Тамга / тэмдэг</p>
        </div>
      </div>

      <p className="mt-8 border-t border-line pt-3 text-center text-[10.5px] text-faint">
        Энэ баримтыг {org.name}-ийн нэгдсэн систем автоматаар үүсгэсэн. Баримтын дугаараар лавлагаа авах боломжтой.
      </p>
    </div>
  );
});
ReceiptSheet.displayName = 'ReceiptSheet';
