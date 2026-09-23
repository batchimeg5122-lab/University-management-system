import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Paperclip, Upload, X } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api';
import { cn, formatBytes } from '@/lib/utils';
import { MAX_SIZE } from '../api';
import { useUploadMaterial } from '../hooks';

const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.csv,.png,.jpg,.jpeg,.webp,.mp4';

export function MaterialUploadModal({ open, onClose, courseId, courseName }: { open: boolean; onClose: () => void; courseId: string; courseName?: string }) {
  const toast = useToast();
  const upload = useUploadMaterial(courseId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', is_published: true });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setForm({ title: '', description: '', is_published: true });
  }, [open]);

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error(`Файлын хэмжээ 50MB-аас хэтэрсэн байна (${formatBytes(f.size)}).`);
      return;
    }
    setFile(f);
    // Гарчиг хоосон бол файлын нэрээс автоматаар авна
    setForm((s) => ({ ...s, title: s.title || f.name.replace(/\.[^.]+$/, '') }));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pick(e.dataTransfer.files?.[0] ?? null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Файлаа сонгоно уу.');
    try {
      await upload.mutateAsync({ file, title: form.title.trim(), description: form.description.trim() || null, is_published: form.is_published });
      toast.success(form.is_published ? 'Материал нэмэгдэж, оюутнуудад харагдана' : 'Материал нэмэгдлээ (нуусан)');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Материал нэмэх"
      description={courseName}
      footer={
        <>
          <Button onClick={onClose}>Болих</Button>
          <Button variant="primary" type="submit" form="material-form" loading={upload.isPending} disabled={!file || form.title.trim().length < 2}>
            Нэмэх
          </Button>
        </>
      }
    >
      <form id="material-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-soft">Файл <span className="text-danger">*</span></p>
          {file ? (
            <div className="flex items-center gap-3 rounded-field border border-line bg-paper px-3 py-2.5">
              <Paperclip className="h-4 w-4 shrink-0 text-faint" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{file.name}</p>
                <p className="num text-xs text-faint">{formatBytes(file.size)}</p>
              </div>
              <button type="button" onClick={() => setFile(null)} className="rounded-md p-1 text-faint hover:text-ink" aria-label="Файл хасах">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'flex w-full flex-col items-center gap-1.5 rounded-field border border-dashed px-4 py-8 transition-colors',
                dragOver ? 'border-accent bg-accent-soft/50' : 'border-line-strong hover:border-accent/50 hover:bg-paper',
              )}
            >
              <Upload className="h-5 w-5 text-faint" />
              <span className="text-sm text-ink">Файлаа чирж оруулах эсвэл сонгох</span>
              <span className="text-xs text-faint">PDF, Word, PowerPoint, Excel, зураг, видео, ZIP. 50MB хүртэл</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>

        <Input label="Гарчиг" required value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Лекц 5: Индексжүүлэлт" />
        <Textarea label="Тайлбар" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Оюутанд өгөх нэмэлт заавар" />

        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#1E4B8F]" checked={form.is_published} onChange={(e) => setForm((s) => ({ ...s, is_published: e.target.checked }))} />
          <span>
            Оюутнуудад шууд харуулах
            <span className="block text-xs text-muted">Тэмдэглэгээг авбал зөвхөн танд харагдана, дараа нь нээж болно</span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
