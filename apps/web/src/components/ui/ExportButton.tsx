import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from './Button';
import { useToast } from './Toast';

/** "Excel татах" товч — onExport дотор exportExcel(...) дуудна */
export function ExportButton({ onExport, disabled, label = 'Excel' }: { onExport: () => Promise<void>; disabled?: boolean; label?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      icon={<FileSpreadsheet className="h-4 w-4" />}
      loading={busy}
      disabled={disabled}
      title="Excel файл болгон татах"
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch (err) {
          toast.error(`Excel үүсгэж чадсангүй: ${(err as Error).message}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </Button>
  );
}
