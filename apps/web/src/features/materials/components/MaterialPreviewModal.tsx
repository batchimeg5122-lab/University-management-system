import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, FileQuestion, X } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import type { CourseMaterial } from '@/types/models';
import { downloadMaterial, materialsApi, type SignedFile } from '../api';

/** Вэб дээр шууд үзэх боломжтой төрлүүд */
export const canPreview = (mime: string | null | undefined) =>
  !!mime && (mime === 'application/pdf' || mime.startsWith('image/') || mime === 'video/mp4' || mime.startsWith('text/'));

function Viewer({ file }: { file: SignedFile }) {
  const mime = file.mime_type ?? '';
  if (mime.startsWith('image/')) {
    return (
      <div className="flex h-full items-center justify-center bg-ink/[0.04] p-4">
        <img src={file.url} alt={file.file_name} className="max-h-full max-w-full rounded-md object-contain" />
      </div>
    );
  }
  if (mime === 'video/mp4') {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <video src={file.url} controls autoPlay className="max-h-full max-w-full" />
      </div>
    );
  }
  // PDF, текст: браузерын өөрийн үзүүлэгч
  return <iframe src={file.url} title={file.file_name} className="h-full w-full border-0 bg-white" />;
}

export function MaterialPreviewModal({ material, onClose }: { material: CourseMaterial | null; onClose: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<SignedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!material) return;
    let active = true;
    setFile(null);
    setFailed(null);
    setLoading(true);
    materialsApi
      .viewUrl(material.id)
      .then((f) => active && setFile(f))
      .catch((err) => active && setFailed(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [material]);

  useEffect(() => {
    if (!material) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [material, onClose]);

  if (!material) return null;
  const previewable = canPreview(material.mime_type);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={material.title}>
      <div className="absolute inset-0 animate-fade-in bg-ink/50" onClick={onClose} />

      <div className="relative mx-auto flex h-full w-full max-w-5xl animate-rise flex-col overflow-hidden rounded-none bg-white shadow-pop sm:rounded-box">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-ink">{material.title}</h2>
            <p className="num mt-0.5 truncate text-xs text-faint">
              {material.file_name}, {formatBytes(material.size_bytes)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {file && (
              <Button size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => window.open(file.url, '_blank', 'noopener')}>
                Шинэ цонхонд
              </Button>
            )}
            <Button
              size="sm"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={async () => {
                try {
                  await downloadMaterial(material.id);
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}
            >
              Татах
            </Button>
            <button onClick={onClose} className="rounded-md p-1.5 text-faint hover:bg-paper hover:text-ink" aria-label="Хаах">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted">
              <Spinner className="h-5 w-5" />
            </div>
          ) : failed ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <FileQuestion className="h-6 w-6 text-faint" />
              <p className="font-medium text-ink">Файлыг нээж чадсангүй</p>
              <p className="max-w-sm text-[13px] text-muted">{failed}</p>
            </div>
          ) : !previewable ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <FileQuestion className="h-6 w-6 text-faint" />
              <p className="font-medium text-ink">Энэ төрлийн файлыг вэб дээр үзэх боломжгүй</p>
              <p className="max-w-sm text-[13px] text-muted">Word, PowerPoint, Excel, ZIP файлыг татаж аваад компьютер дээрээ нээнэ үү.</p>
              <Button
                className="mt-2"
                variant="primary"
                icon={<Download className="h-4 w-4" />}
                onClick={() => downloadMaterial(material.id).catch((err) => toast.error(errorMessage(err)))}
              >
                Татах
              </Button>
            </div>
          ) : (
            file && <Viewer file={file} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
