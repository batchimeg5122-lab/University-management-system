import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABEL } from '@/lib/constants';
import { cn, shortName } from '@/lib/utils';
import { Avatar } from '../ui/Avatar';
import { NAVIGATION } from './navigation';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { session, signOut } = useAuth();
  if (!session) return null;
  const groups = NAVIGATION[session.user.role];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-white">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <img src="/logo.png" alt="" className="h-7 w-7" />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold text-ink">Их Засаг</p>
          <p className="text-[11.5px] text-faint">Сургалт, санхүүгийн систем</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2" aria-label="Үндсэн цэс">
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-5')}>
            {group.title && <p className="mb-1.5 px-2.5 text-xs font-medium text-faint">{group.title}</p>}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-9 items-center gap-2.5 rounded-field px-2.5 text-[13.5px] transition-colors',
                        isActive ? 'bg-accent-soft font-medium text-accent-ink' : 'text-ink-soft hover:bg-paper hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('h-[17px] w-[17px] shrink-0', isActive ? 'text-accent' : 'text-faint group-hover:text-muted')} strokeWidth={1.8} />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-field px-2 py-1.5">
          <Avatar name={session.user.full_name} size={32} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-ink">{shortName(session.user.full_name)}</p>
            <p className="truncate text-xs text-faint">{ROLE_LABEL[session.user.role]}</p>
          </div>
          <button onClick={() => void signOut()} className="rounded-md p-1.5 text-faint hover:bg-paper hover:text-ink" aria-label="Гарах" title="Гарах">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
