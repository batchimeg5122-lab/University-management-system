import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, GraduationCap, Search } from 'lucide-react';
import { studentsApi } from '@/features/students/api';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';
import type { StudentView } from '@/types/models';
import { NAVIGATION, type NavItem } from './navigation';

type Item = { id: string; label: string; hint?: string; icon: NavItem['icon']; to: string; group: string };

const norm = (s: string) => s.toLowerCase().trim();

/** Ctrl+K / ⌘K — хуудас, оюутныг хайж шууд очих */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { role, is } = useRole();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [students, setStudents] = useState<StudentView[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const canSearchStudents = is('super_admin', 'academic', 'management');

  useEffect(() => {
    if (!open) return;
    setQ('');
    setStudents([]);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  // Оюутан хайх (debounce 250ms)
  useEffect(() => {
    if (!open || !canSearchStudents || q.trim().length < 2) {
      setStudents([]);
      return;
    }
    const t = setTimeout(() => {
      studentsApi
        .list({ q: q.trim() })
        .then((rows) => setStudents(rows.slice(0, 8)))
        .catch(() => setStudents([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, canSearchStudents]);

  const items = useMemo<Item[]>(() => {
    const pages = (role ? NAVIGATION[role] : []).flatMap((g) =>
      g.items.map((i) => ({ id: `page:${i.to}`, label: i.label, hint: g.title, icon: i.icon, to: i.to, group: 'Хуудас' })),
    );
    const s = norm(q);
    const matchedPages = s ? pages.filter((p) => norm(p.label).includes(s) || norm(p.hint ?? '').includes(s)) : pages;
    const people: Item[] = students.map((st) => ({
      id: `student:${st.id}`,
      label: st.full_name,
      hint: `${st.student_code} · ${st.class_name ?? ''}`,
      icon: GraduationCap,
      to: `/academic/students/${st.id}`,
      group: 'Оюутан',
    }));
    return [...matchedPages.slice(0, 10), ...people];
  }, [role, q, students]);

  useEffect(() => setActive(0), [q, students.length]);

  if (!open) return null;

  const go = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    navigate(item.to);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === 'Escape') onClose();
  };

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Хайлт">
      <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-rise overflow-hidden rounded-box border border-line bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={canSearchStudents ? 'Хуудас, оюутны нэр эсвэл код...' : 'Хуудас хайх...'}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[11px] text-faint">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Илэрц олдсонгүй</li>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                {header && <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-faint">{header}</p>}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn('flex w-full items-center gap-3 px-4 py-2 text-left text-sm', i === active ? 'bg-accent-soft text-accent-ink' : 'text-ink')}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="truncate text-[12px] text-muted">{item.hint}</span>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-faint" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-faint">
          <span>↑↓ сонгох</span>
          <span>Enter нээх</span>
          <span className="ml-auto">Ctrl + K</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Ctrl+K / ⌘K товчлолыг сонсох hook */
export function useCommandPaletteShortcut(setOpen: (fn: (v: boolean) => boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);
}
