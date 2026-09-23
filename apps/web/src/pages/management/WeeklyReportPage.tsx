import { useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { Button, ErrorState, Input, PageHeader, PageLoader, Panel } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useSendWeekly, useWeeklyReport } from '@/features/analytics/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';

/** Долоо хоногийн тойм — урьдчилан харах, и-мэйлээр илгээх */
export default function WeeklyReportPage() {
  useDocumentTitle('Долоо хоногийн тайлан');
  const toast = useToast();
  const { data, isLoading, error, refetch, isFetching } = useWeeklyReport();
  const send = useSendWeekly();
  const [to, setTo] = useState('');

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const doSend = () =>
    send.mutate(to.trim() ? to.split(/[,;\s]+/).filter(Boolean) : undefined, {
      onSuccess: (r) => toast.success(`${r.sent} хүлээн авагчид илгээгдлээ`),
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <>
      <PageHeader
        title="Долоо хоногийн тайлан"
        description="Сүүлийн 7 хоногийн тойм. WEEKLY_REPORT=true бол Даваа гараг бүр 09:00-д удирдлагад автоматаар и-мэйлээр очно."
        actions={<Button icon={<RefreshCw className="h-4 w-4" />} loading={isFetching} onClick={() => void refetch()}>Шинэчлэх</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel flush title="Урьдчилан харах">
          <iframe title="Тайлан" srcDoc={data?.html} className="h-[75vh] w-full rounded-b-box border-0 bg-paper" sandbox="" />
        </Panel>
        <Panel title="И-мэйлээр илгээх">
          {!data?.smtp ? (
            <p className="rounded-field bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
              SMTP тохируулаагүй байна. <code>apps/api/.env</code>-д SMTP_HOST, SMTP_USER, SMTP_PASS бөглөөд API-г дахин асаана.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <Input label="Хүлээн авагч" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Хоосон бол REPORT_RECIPIENTS" hint="Таслалаар тусгаарлана" type="text" />
              <Button variant="primary" icon={<Send className="h-4 w-4" />} loading={send.isPending} onClick={doSend}>Одоо илгээх</Button>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
