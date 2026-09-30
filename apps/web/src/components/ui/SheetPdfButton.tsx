import { useRef, useState, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { FileDown } from 'lucide-react';
import { exportNodeToPdf } from '@/lib/pdf';
import { Button } from './Button';
import { useToast } from './Toast';

/**
 * A4 хуудсыг дэлгэцээс гадна зурж PDF болгон татах товч.
 * `sheet` нь ref хүлээн авах хэвлэх хуудсыг буцаана (жишээ нь WorkloadSheet).
 */
export function SheetPdfButton({
  sheet,
  fileName,
  title,
  subject,
  label = 'PDF татах',
  disabled,
  variant = 'secondary',
}: {
  sheet: (ref: Ref<HTMLDivElement>) => ReactNode;
  fileName: string;
  title: string;
  subject?: string;
  label?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);

  const run = async () => {
    setRendering(true);
    // DOM-д зурагдахыг хүлээнэ
    await new Promise((r) => setTimeout(r, 140));
    try {
      if (!ref.current) throw new Error('Хуудас бэлэн биш');
      await exportNodeToPdf(ref.current, fileName, { title, subject });
      toast.success('PDF татагдлаа');
    } catch (err) {
      toast.error(`PDF үүсгэж чадсангүй: ${(err as Error).message}`);
    } finally {
      setRendering(false);
    }
  };

  return (
    <>
      <Button variant={variant} icon={<FileDown className="h-4 w-4" />} loading={rendering} disabled={disabled} onClick={run}>
        {label}
      </Button>
      {rendering &&
        createPortal(
          <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0 }}>
            {sheet(ref)}
          </div>,
          document.body,
        )}
    </>
  );
}
