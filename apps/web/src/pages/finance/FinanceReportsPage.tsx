import { useState } from 'react';
import { BarList } from '@/components/charts/BarList';
import { SegmentBar } from '@/components/charts/SegmentBar';
import { ErrorState, PageHeader, PageLoader, Panel, Select, StatStrip } from '@/components/ui';
import { useFinanceReport } from '@/features/finance/hooks';
import { useCurrentSemester, useSemesters } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { INVOICE_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { formatMoney, percent } from '@/lib/utils';
import type { PaymentMethod } from '@/types/models';

export default function FinanceReportsPage() {
  useDocumentTitle('Санхүүгийн тайлан');
  const { data: current } = useCurrentSemester();
  const { data: semesters } = useSemesters();
  const [semesterId, setSemesterId] = useState('');
  const active = semesterId || current?.id;
  const { data, isLoading, error, refetch } = useFinanceReport(active);

  return (
    <>
      <PageHeader
        title="Санхүүгийн тайлан"
        description="Улирлын төлбөрийн орлого, авлагыг сургууль болон төлбөрийн хэлбэрээр."
        actions={<Select className="w-60" value={active ?? ''} onChange={(e) => setSemesterId(e.target.value)} options={(semesters ?? []).map((s) => ({ value: s.id, label: `${s.academic_year} ${s.name}` }))} />}
      />
      {isLoading ? <PageLoader /> : error || !data ? <ErrorState error={error} onRetry={refetch} /> : (
        <>
          <StatStrip
            className="mb-6"
            items={[
              { label: 'Нэхэмжилсэн', value: formatMoney(data.total_billed) },
              { label: 'Хөнгөлөлт', value: formatMoney(data.total_discount) },
              { label: 'Орсон төлбөр', value: formatMoney(data.total_paid), tone: 'success' },
              { label: 'Авлага', value: formatMoney(data.total_outstanding), tone: data.total_outstanding ? 'danger' : 'default' },
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Нэхэмжлэлийн төлөв">
              <SegmentBar
                segments={[
                  { label: INVOICE_STATUS_LABEL.paid, value: data.by_status.paid ?? 0, color: 'bg-success' },
                  { label: INVOICE_STATUS_LABEL.partial, value: data.by_status.partial ?? 0, color: 'bg-warn' },
                  { label: INVOICE_STATUS_LABEL.pending, value: data.by_status.pending ?? 0, color: 'bg-line-strong' },
                  { label: INVOICE_STATUS_LABEL.overdue, value: data.by_status.overdue ?? 0, color: 'bg-danger' },
                ]}
              />
            </Panel>
            <Panel title="Төлбөрийн хэлбэрээр">
              <BarList format={(v) => formatMoney(v)} items={(Object.entries(data.by_method) as [PaymentMethod, number][]).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: PAYMENT_METHOD_LABEL[k], value: v }))} />
            </Panel>
          </div>
          <Panel flush title="Сургуулиар" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-[12.5px] text-muted">
                    <th className="px-5 py-2.5 text-left font-medium">Сургууль</th>
                    <th className="px-3 py-2.5 text-right font-medium">Төлөх</th>
                    <th className="px-3 py-2.5 text-right font-medium">Орсон</th>
                    <th className="w-48 px-5 py-2.5 text-right font-medium">Цуглуулалт</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_school.map((s) => {
                    const rate = s.billed ? (s.paid / s.billed) * 100 : 0;
                    return (
                      <tr key={s.name} className="border-b border-line last:border-0">
                        <td className="px-5 py-3">{s.name}</td>
                        <td className="num px-3 py-3 text-right">{formatMoney(s.billed)}</td>
                        <td className="num px-3 py-3 text-right">{formatMoney(s.paid)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/[0.07]"><div className="h-full rounded-full bg-accent" style={{ width: `${rate}%` }} /></div>
                            <span className="num w-12 text-right font-medium">{percent(rate)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
