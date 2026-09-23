import { Link } from 'react-router-dom';
import { Bell, Menu, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useNotifications } from '@/features/notifications/hooks';
import { env } from '@/lib/env';

export function Header({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { data: semester } = useCurrentSemester();
  const { data: notifications } = useNotifications();
  const unread = notifications?.filter((n) => n.user_id && !n.is_read).length ?? 0;
  const { mode, cycle } = useTheme();
  const ThemeIcon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button onClick={onMenu} className="-ml-1 rounded-md p-1.5 text-ink-soft hover:bg-ink/5 lg:hidden" aria-label="Цэс нээх">
        <Menu className="h-5 w-5" />
      </button>

      {semester && (
        <p className="truncate text-[13px] text-muted">
          <span className="hidden sm:inline">{semester.academic_year} оны </span>
          {semester.name.toLowerCase()}
        </p>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={cycle}
          className="rounded-md p-1.5 text-ink-soft hover:bg-ink/5"
          aria-label={`Харагдах байдал: ${mode === 'dark' ? 'Бараан' : mode === 'light' ? 'Цайвар' : 'Систем'}`}
          title={`Харагдах байдал: ${mode === 'dark' ? 'Бараан' : mode === 'light' ? 'Цайвар' : 'Систем'} (дарж солих)`}
        >
          <ThemeIcon className="h-5 w-5" />
        </button>
        <button
          onClick={onSearch}
          className="flex items-center gap-2 rounded-field border border-line bg-white px-2.5 py-1.5 text-[13px] text-faint hover:border-line-strong hover:text-muted"
          aria-label="Хайх (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Хайх…</span>
          <kbd className="hidden rounded border border-line px-1 text-[10px] sm:inline">Ctrl K</kbd>
        </button>
        {env.useMock && (
          <span className="hidden rounded-full border border-gold/30 bg-gold-soft px-2.5 py-0.5 text-xs font-medium text-gold sm:inline">
            Туршилтын горим
          </span>
        )}
        <Link to="/notifications" className="relative rounded-md p-2 text-ink-soft hover:bg-ink/5 hover:text-ink" aria-label={`Мэдэгдэл${unread ? `, ${unread} уншаагүй` : ''}`}>
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-paper bg-danger" />}
        </Link>
      </div>
    </header>
  );
}
