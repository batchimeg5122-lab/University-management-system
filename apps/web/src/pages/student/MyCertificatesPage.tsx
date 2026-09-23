import { useRef, useState, type FormEvent } from 'react';
import { Download, FileCheck2, Printer, ShieldCheck } from 'lucide-react';
import { Badge, Button, ErrorState, Input, Modal, PageHeader, PageLoader, Panel, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CERT_PURPOSE } from '@/features/certificates/api';
import { CertificateSheet } from '@/features/certificates/components/CertificateSheet';
import { useCreateCertificate, useMyCertificates } from '@/features/certificates/hooks';
import { downloadCertificatePdf } from '@/features/certificates/lib/pdf';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFormState } from '@/hooks/useFormState';
import { errorMessage } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { StudentCertificate } from '@/types/models';

const empty = { purpose: 'bank', purpose_note: '', include_gpa: 'false', valid_days: '30' };

export default function MyCertificatesPage() {
  useDocumentTitle('Тодорхойлолт');
  const toast = useToast();
  const { data, isLoading, error, refetch } = useMyCertificates();
  const create = useCreateCertificate();
  const { values, bind, set, reset } = useFormState(empty);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<StudentCertificate | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const onDownload = async (cert: StudentCertificate) => {
    // Хуудас DOM-д байхгүй бол эхлээд нээнэ
    if (!sheetRef.current || viewing?.id !== cert.id) {
      setViewing(cert);
      await new Promise((r) => setTimeout(r, 400));
    }
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      await downloadCertificatePdf(sheetRef.current, cert);
      toast.success('PDF татагдлаа');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const verifyUrl = `${window.location.origin}/verify`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const cert = await create.mutateAsync({
        purpose: values.purpose,
        purpose_note: values.purpose_note || null,
        include_gpa: values.include_gpa === 'true',
        valid_days: Number(values.valid_days),
      });
      toast.success(`Тодорхойлолт бэлэн боллоо: ${cert.number}`);
      setCreating(false);
      reset(empty);
      setViewing(cert);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Сурлагын тодорхойлолт"
          description="Тухайн сургуульд суралцаж байгааг гэрчлэх албан ёсны тодорхойлолт. Шууд хэвлэж, кодоор нь шалгуулах боломжтой."
          actions={
            <Button variant="primary" icon={<FileCheck2 className="h-4 w-4" />} onClick={() => { reset(empty); setCreating(true); }}>
              Тодорхойлолт авах
            </Button>
          }
        />

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data?.length ? (
          <Panel>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ShieldCheck className="h-6 w-6 text-faint" />
              <p className="font-medium text-ink">Тодорхойлолт аваагүй байна</p>
              <p className="max-w-md text-[13px] text-muted">
                Банк, цэргийн бүртгэл, виз зэрэгт шаардлагатай тодорхойлолтыг хэдхэн секундэд авч, хэвлэж болно.
              </p>
            </div>
          </Panel>
        ) : (
          <Panel flush title={`${data.length} тодорхойлолт`}>
            <ul className="divide-y divide-line">
              {data.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="num text-sm font-medium text-ink">{c.number}</p>
                      {c.is_valid ? <Badge tone="success" dot>Хүчинтэй</Badge> : <Badge tone="danger" dot>{c.revoked_at ? 'Хүчингүй болсон' : 'Хугацаа дууссан'}</Badge>}
                      {c.include_gpa && <Badge tone="accent">Голч дүнтэй</Badge>}
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {CERT_PURPOSE[c.purpose] ?? 'Бусад'}
                      {c.purpose_note ? `, ${c.purpose_note}` : ''}
                    </p>
                    <p className="num mt-1 text-xs text-faint">
                      Олгосон {formatDateTime(c.issued_at)}
                      {c.valid_until ? `, ${formatDate(c.valid_until)} хүртэл хүчинтэй` : ''}, код {c.verify_code}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => setViewing(c)}>
                      Харах
                    </Button>
                    <Button
                      size="sm"
                      variant="subtle"
                      icon={<Download className="h-3.5 w-3.5" />}
                      loading={downloading && viewing?.id === c.id}
                      onClick={() => onDownload(c)}
                    >
                      PDF татах
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Modal
          open={creating}
          onClose={() => setCreating(false)}
          title="Тодорхойлолт авах"
          description="Мэдээллийг системээс автоматаар бөглөнө. Хэвлэсний дараа сургалтын албаар тамга даруулна."
          footer={
            <>
              <Button onClick={() => setCreating(false)}>Болих</Button>
              <Button variant="primary" type="submit" form="cert-form" loading={create.isPending}>Үүсгэх</Button>
            </>
          }
        >
          <form id="cert-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <Select label="Зориулалт" wrapperClassName="sm:col-span-2" options={Object.entries(CERT_PURPOSE).map(([value, label]) => ({ value, label }))} {...bind('purpose')} />
            <Textarea label="Нэмэлт тайлбар" wrapperClassName="sm:col-span-2" rows={2} placeholder="Жишээ нь: Хаан банкны оюутны зээлд" {...bind('purpose_note')} />
            <Input label="Хүчинтэй хугацаа (хоног)" type="number" min={1} max={365} {...bind('valid_days')} />
            <label className="flex items-start gap-2 self-end pb-2 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[#1E4B8F]"
                checked={values.include_gpa === 'true'}
                onChange={(e) => set('include_gpa', e.target.checked ? 'true' : 'false')}
              />
              <span>
                Голч дүн, кредит оруулах
                <span className="block text-xs text-muted">Тэтгэлэг, шилжилтэд шаардлагатай бол</span>
              </span>
            </label>
          </form>
        </Modal>
      </div>

      {/* Хэвлэх харагдац */}
      {viewing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 p-0 sm:p-6 print:static print:bg-white print:p-0">
          <div className="mx-auto max-w-4xl rounded-box bg-white shadow-pop print:max-w-none print:rounded-none print:shadow-none">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 print:hidden">
              <p className="num text-sm font-medium text-ink">{viewing.number}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" icon={<Download className="h-3.5 w-3.5" />} loading={downloading} onClick={() => onDownload(viewing)}>
                  PDF татах
                </Button>
                <Button size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>
                  Хэвлэх
                </Button>
                <Button size="sm" onClick={() => setViewing(null)}>Хаах</Button>
              </div>
            </div>
            <CertificateSheet ref={sheetRef} certificate={viewing} verifyUrl={verifyUrl} />
          </div>
        </div>
      )}
    </>
  );
}
