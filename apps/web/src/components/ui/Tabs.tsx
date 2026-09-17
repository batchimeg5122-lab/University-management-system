import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-field border border-line bg-white p-0.5', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium transition-colors',
            value === o.value ? 'bg-ink text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('num text-xs', value === o.value ? 'text-white/70' : 'text-faint')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function LinkTabs({ tabs }: { tabs: { to: string; label: string; end?: boolean }[] }) {
  return (
    <nav className="-mb-px flex gap-6 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors',
              isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
