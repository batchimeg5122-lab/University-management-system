import { useState } from 'react';
import { Download, Eye, EyeOff, File, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo, Maximize2, Presentation, Trash2, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/api';
import { cn, formatBytes, formatDate, shortName } from '@/lib/utils';
import type { CourseMaterial, MaterialStats } from '@/types/models';
import { downloadMaterial } from '../api';
import { MaterialPreviewModal, canPreview } from './MaterialPreviewModal';
import { useDeleteMaterial, useUpdateMaterial } from '../hooks';

function iconFor(mime: string | null): LucideIcon {
  if (!mime) return File;
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('presentation') || mime.includes('powerpoint')) return Presentation;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet;
  if (mime.includes('zip')) return FileArchive;
  return FileText;
}

export function MaterialList({
  materials,
  canManage,
  showCourse,
  stats,
  onShowAccess,
}: {
  materials: CourseMaterial[];
  canManage?: boolean;
  showCourse?: boolean;
  /** Материал бүрийг хэдэн оюутан үзсэн (үзэх, татах хоёулаа тооцогдоно) */
  stats?: MaterialStats;
  onShowAccess?: (materialId: string) => void;
}) {
  const toast = useToast();
  const update = useUpdateMaterial();
  const remove = useDeleteMaterial();
  const [toDelete, setToDelete] = useState<CourseMaterial | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [preview, setPreview] = useState<CourseMaterial | null>(null);

  const onDownload = async (m: CourseMaterial) => {
    setDownloading(m.id);
    try {
      await downloadMaterial(m.id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  if (!materials.length) {
    return (
      <EmptyState
        icon={FileText}
        title="Материал алга"
        description={canManage ? 'Лекц, гарын авлага, бие даалтын заавар зэргийг нэмж оюутнуудад хүргэнэ.' : 'Багш материал нэмэхэд энд харагдана.'}
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {materials.map((m) => {
          const Icon = iconFor(m.mime_type);
          return (
            <li key={m.id} className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center', !m.is_published && 'bg-paper/60')}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{m.title}</p>
                  {!m.is_published && <Badge tone="warn">Нуусан</Badge>}
                  {showCourse && m.subject_name && <Badge tone="accent">{m.subject_name}</Badge>}
                </div>
                {m.description && <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-muted">{m.description}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-faint">
                  <span className="truncate">{m.file_name}</span>
                  <span className="num">{formatBytes(m.size_bytes)}</span>
                  <span className="num">{formatDate(m.created_at)}</span>
                  {m.uploaded_by_name && <span>{shortName(m.uploaded_by_name)}</span>}
                  {stats && (
                    <button
                      type="button"
                      onClick={() => onShowAccess?.(m.id)}
                      className="num inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 font-medium text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink"
                      title="Хэн үзсэнийг харах"
                    >
                      <Users className="h-3 w-3" />
                      {stats.by_material[m.id]?.students ?? 0} / {stats.total_students} оюутан үзсэн
                    </button>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                {canPreview(m.mime_type) && (
                  <Button size="sm" variant="subtle" icon={<Maximize2 className="h-3.5 w-3.5" />} onClick={() => setPreview(m)} title="Вэб дээр шууд үзэх">
                    Үзэх
                  </Button>
                )}
                <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} loading={downloading === m.id} onClick={() => onDownload(m)} title="Татах">
                  Татах
                </Button>
                {canManage && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      title={m.is_published ? 'Оюутнаас нуух' : 'Оюутанд харуулах'}
                      aria-label={m.is_published ? 'Нуух' : 'Харуулах'}
                      loading={update.isPending && update.variables?.id === m.id}
                      onClick={() => update.mutate({ id: m.id, is_published: !m.is_published })}
                    >
                      {m.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Устгах" onClick={() => setToDelete(m)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <MaterialPreviewModal material={preview} onClose={() => setPreview(null)} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        tone="danger"
        title="Материал устгах уу?"
        confirmLabel="Устгах"
        loading={remove.isPending}
        description={toDelete && `"${toDelete.title}" материал болон түүний файл бүрмөсөн устана. Оюутнууд цаашид үзэж, татаж чадахгүй.`}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(toDelete!.id);
            toast.success('Материал устгагдлаа');
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setToDelete(null);
        }}
      />
    </>
  );
}
