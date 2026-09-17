import { Link } from 'react-router-dom';
import { BarList } from '@/components/charts/BarList';
import { PageHeader, PageLoader, Panel, ProgressBar, StatStrip } from '@/components/ui';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import { useFinanceReport, useInvoices, usePayments } from '@/features/finance/hooks';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { INVOICE_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { formatDate, formatMoney, timeAgo } from '@/lib/utils';
import type { InvoiceStatus, PaymentMethod } from '@/types/models';

const compact = (v: number) => `${(v / 1_000_000).toFixed(1)} сая₮`;

export default function FinanceDashboard() {
  useDocumentTitle('Санхүүгийн алба');
  const { data: semester } = useCurrentSemester();
  const { data: report, isLoading } = useFinanceReport(semester?.id);
  const { data: overdue } = useInvoices({ status: 'overdue', semester_id: semester?.id });
  const { data: payments } = usePayments({});
  const net = report ? report.total_billed - report.total_discount : 0;
  const rate = net ? (report!.total_paid / net) * 100 : 0;

  return (
    <>
      <PageHeader title="Санхүүгийн алба" description={semester ? `${semester.academic_year} оны ${semester.name.toLowerCase()}ын төлбөрийн явц` : undefined} />

      <StatStrip
        loading={isLoading}
        className="mb-6"
        items={[
          { label: 'Нэхэмжилсэн', value: compact(report?.total_billed ?? 0) },
          { label: 'Хөнгөлөлт', value: compact(report?.total_discount ?? 0) },
          { label: 'Орсон төлбөр', value: compact(report?.total_paid ?? 0), tone: 'success' },
          { label: 'Авлага', value: compact(report?.total_outstanding ?? 0), tone: 'danger' },
        ]}
      />

      {report && (
        <Panel className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium text-ink">Төлбөр цуглуулалт</p>
            <p className="num text-2xl font-semibold tracking-tight">{rate.toFixed(1)}%</p>
          </div>
          <ProgressBar value={rate} className="h-2" />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted">
            {(Object.entries(report.by_status) as [InvoiceStatus, number][]).map(([k, v]) => (
              <span key={k}>{INVOICE_STATUS_LABEL[k]} <span className="num font-semibold text-ink">{v}</span></span>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel flush title="Хугацаа хэтэрсэн" actions={<Link to="/finance/invoices" className="text-[13px] font-medium text-accent hover:underline">Нэхэмжлэл</Link>}>
          {!overdue ? <PageLoader /> : !overdue.length ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted">Хугацаа хэтэрсэн нэхэмжлэл алга.</p>
          ) : (
            <ul className="divide-y divide-line">
              {overdue.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.student_name}</p>
                    <p className="text-xs text-faint">{i.student_code}, хугацаа {formatDate(i.due_date)}</p>
                  </div>
                  <span className="num text-sm font-medium">{formatMoney(i.net_amount - i.paid_amount)}</span>
                  <InvoiceStatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Төлбөрийн хэлбэрээр">
          {report ? (
            <BarList format={compact} items={(Object.entries(report.by_method) as [PaymentMethod, number][]).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: PAYMENT_METHOD_LABEL[k], value: v }))} />
          ) : <PageLoader />}
        </Panel>
      </div>

      <Panel flush title="Сүүлийн төлөлтүүд" className="mt-6" actions={<Link to="/finance/payments" className="text-[13px] font-medium text-accent hover:underline">Бүгд</Link>}>
        <ul className="divide-y divide-line">
          {payments?.slice(0, 6).map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.student_name}</p>
                <p className="text-xs text-faint">{PAYMENT_METHOD_LABEL[p.method]}, {timeAgo(p.payment_date)}</p>
              </div>
              <span className="num text-sm font-semibold text-success">+{formatMoney(p.amount)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
