import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Хайлттай олон сонголт (анги, хичээл, сургууль ...) */
export function MultiPicker({ label, options, value, onChange, placeholder = 'Хайх...' }: {
  label?: string;
  options: { value: string; label: string; hint?: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.toLowerCase().trim();
    return s ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(s)) : options;
  }, [options, q]);
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span className="font-medium text-ink-soft">{label}</span>
          <span className="text-muted">
            {value.length} сонгосон
            {value.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="ml-2 text-accent hover:underline">
                цэвэрлэх
              </button>
            )}
          </span>
        </div>
      )}
      <div className="rounded-field border border-line">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-3.5 w-3.5 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-9 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <ul className="max-h-52 overflow-y-auto py-1">
          {shown.length === 0 && <li className="px-3 py-3 text-center text-[13px] text-muted">Илэрц алга</li>}
          {shown.map((o) => {
            const on = value.includes(o.value);
            return (
              <li key={o.value}>
                <button type="button" onClick={() => toggle(o.value)} className={cn('flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] hover:bg-paper', on && 'bg-accent-soft/60')}>
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-accent bg-accent text-white' : 'border-line-strong')}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="truncate text-[12px] text-faint">{o.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
