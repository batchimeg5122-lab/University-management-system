import { Link } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useCurrentSemester } from '@/features/semesters/hooks';
import { useNotifications } from '@/features/notifications/hooks';
import { env } from '@/lib/env';

export function Header({ onMenu }: { onMenu: () => void }) {
  const { data: semester } = useCurrentSemester();
  const { data: notifications } = useNotifications();
  const unread = notifications?.filter((n) => n.user_id && !n.is_read).length ?? 0;

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
