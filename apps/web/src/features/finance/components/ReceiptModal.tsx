import { useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button, ErrorState, Modal, Spinner, useToast } from '@/components/ui';
import { exportNodeToPdf } from '@/lib/pdf';
import { usePaymentReceipt } from '../hooks';
import { ReceiptSheet } from './ReceiptSheet';

/**
 * Төлбөр төлсөн баримтыг харуулж, PDF болгон татах / хэвлэх цонх.
 * Санхүү, Сургалтын алба, удирдлага бүх баримтыг; оюутан зөвхөн өөрийнхөө (API шалгана).
 */
export function ReceiptModal({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) {
  const toast = useToast();
  const { data, isLoading, error, refetch } = usePaymentReceipt(paymentId);
  const sheet = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!paymentId) return null;

  const download = async () => {
    if (!sheet.current || !data) return;
    setBusy(true);
    try {
      await exportNodeToPdf(sheet.current, `barimt-${data.receipt_no ?? data.id.slice(0, 8)}`, {
        title: `Төлбөрийн баримт ${data.receipt_no ?? ''}`.trim(),
        subject: data.student.name ?? '',
      });
      toast.success('Баримт татагдлаа');
    } catch (err) {
      toast.error(`PDF үүсгэж чадсангүй: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    const node = sheet.current;
    if (!node) return;
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return toast.error('Хэвлэх цонх нээгдсэнгүй. Хөтчийн pop-up хоригийг шалгана уу.');
    const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join('');
    win.document.write(`<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Төлбөрийн баримт</title>${styles}</head><body>${node.outerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Төлбөр төлсөн баримт"
      description={data ? `Дугаар ${data.receipt_no ?? '—'} · ${data.student.name ?? ''}` : 'Баримт бэлдэж байна…'}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>Хаах</Button>
          <Button icon={<Printer className="h-4 w-4" />} disabled={!data} onClick={print}>
            Хэвлэх
          </Button>
          <Button variant="primary" icon={<Download className="h-4 w-4" />} loading={busy} disabled={!data} onClick={download}>
            PDF татах
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data ? (
        // A4 өргөнийг цонхонд багтааж харуулна — PDF нь бүтэн хэмжээгээр гарна
        <div className="overflow-hidden rounded-box border border-line">
          <div className="origin-top-left scale-[0.82] sm:scale-100" style={{ width: 794 }}>
            <ReceiptSheet ref={sheet} receipt={data} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
