import { useState } from 'react';
import { Check, Copy, KeyRound, Printer } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface Credentials {
  fullName: string;
  /** Цонхны гарчиг (анхдагч: "Нэвтрэх эрх үүслээ") */
  title?: string;
  /** Нэвтрэх нэр (оюутны код, ажилтны код эсвэл и-мэйл) */
  loginIds: { label: string; value: string }[];
  password: string | null;
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard эрхгүй бол гараар хуулна */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-faint">{label}</p>
        <p className={cn('truncate text-sm font-medium text-ink', mono && 'num font-mono text-[15px] tracking-wide')}>{value}</p>
      </div>
      <button type="button" onClick={copy} className="shrink-0 rounded-md p-1.5 text-faint hover:bg-paper hover:text-ink" aria-label={`${label} хуулах`}>
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Шинэ хэрэглэгчийн нэвтрэх мэдээлэл.
 * Нууц үг серверт хадгалагддаггүй тул энэ цонхыг хаасны дараа дахин харах боломжгүй.
 */
export function CredentialsDialog({ credentials, onClose }: { credentials: Credentials | null; onClose: () => void }) {
  const [copiedAll, setCopiedAll] = useState(false);
  if (!credentials) return null;

  const text = [
    `${credentials.fullName}`,
    ...credentials.loginIds.map((l) => `${l.label}: ${l.value}`),
    credentials.password ? `${credentials.title ? 'Шинэ' : 'Анхны'} нууц үг: ${credentials.password}` : null,
    `Нэвтрэх хаяг: ${window.location.origin}/login`,
  ]
    .filter(Boolean)
    .join('\n');

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const print = () => {
    const w = window.open('', '_blank', 'width=420,height=360');
    if (!w) return;
    w.document.write(`<pre style="font:15px/1.7 system-ui,sans-serif;padding:24px">${text.replace(/</g, '&lt;')}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={credentials.title ?? 'Нэвтрэх эрх үүслээ'}
      description={credentials.fullName}
      footer={
        <>
          <Button icon={<Printer className="h-4 w-4" />} onClick={print}>Хэвлэх</Button>
          <Button icon={copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copyAll}>
            {copiedAll ? 'Хуулагдлаа' : 'Бүгдийг хуулах'}
          </Button>
          <Button variant="primary" onClick={onClose}>Дуусгах</Button>
        </>
      }
    >
      <div className="rounded-field border border-line px-4">
        {credentials.loginIds.map((l) => (
          <CopyRow key={l.label} label={l.label} value={l.value} />
        ))}
        {credentials.password && <CopyRow label={credentials.title ? 'Шинэ нууц үг' : 'Анхны нууц үг'} value={credentials.password} mono />}
      </div>

      {credentials.password ? (
        <p className="mt-4 flex gap-2 rounded-field bg-warn-soft px-3 py-2.5 text-[13px] leading-relaxed text-warn">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          Нууц үгийг хадгалдаггүй тул энэ цонхыг хаасны дараа дахин харах боломжгүй. Хэрэглэгчид гардуулж, анх нэвтэрсний дараа солихыг сануулна уу.
        </p>
      ) : (
        <p className="mt-4 text-[13px] text-muted">Таны оруулсан нууц үгээр нэвтэрнэ. Хэрэглэгчид аюулгүй сувгаар дамжуулна уу.</p>
      )}
    </Modal>
  );
}
