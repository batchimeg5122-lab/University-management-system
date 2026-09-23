import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { CommandPalette, useCommandPaletteShortcut } from './CommandPalette';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  useCommandPaletteShortcut(setSearch);
  const location = useLocation();
  useRealtimeNotifications();
  const [mfaRequired, setMfaRequired] = useState(false);

  // API 2FA шаардсан (MFA_REQUIRED) үед анхааруулга харуулна
  useEffect(() => {
    const on = () => setMfaRequired(true);
    window.addEventListener('mfa-required', on);
    return () => window.removeEventListener('mfa-required', on);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-rise shadow-pop">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <Header onMenu={() => setOpen(true)} onSearch={() => setSearch(true)} />
        {mfaRequired && location.pathname !== '/security' && (
          <div className="flex items-center gap-3 border-b border-warn/30 bg-warn-soft px-4 py-2.5 text-[13px] text-warn sm:px-6 lg:px-8">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="flex-1">Байгууллагын бодлогоор ажилтнууд хоёр шатлалт баталгаажуулалт (2FA) заавал ашиглана. Тохируулсны дараа дахин нэвтэрнэ үү.</span>
            <Link to="/security" className="font-semibold underline">2FA тохируулах</Link>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
        <CommandPalette open={search} onClose={() => setSearch(false)} />
      </div>
    </div>
  );
}
