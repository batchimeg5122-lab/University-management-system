import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { errorMessage } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { ROLE_HOME, ROLE_LABEL } from '@/lib/constants';
import { env } from '@/lib/env';
import type { UserRole } from '@/types/models';

const SCHOOLS = [
  'Хууль зүйн сургууль',
  'Үндэсний инженер технологийн сургууль',
  'Анагаах ухааны сургууль',
  'Санхүү эдийн засгийн сургууль',
  'Чингис Соосэ сургууль',
  'Аюулгүй байдал, хууль сахиулахын сургууль',
  'Шинжлэх ухааны сургууль',
  'Хүмүүнлэгийн ухааны сургууль',
  'Их Засаг Политехник коллеж',
];

const DEMO: { role: UserRole; name: string }[] = [
  { role: 'student', name: 'Б.Бат-Эрдэнэ' },
  { role: 'teacher', name: 'Б.Бат' },
  { role: 'academic', name: 'Д.Сарангэрэл' },
  { role: 'finance', name: 'П.Энхтуяа' },
  { role: 'management', name: 'Ц.Оюунчимэг' },
  { role: 'super_admin', name: 'Г.Мөнх-Эрдэнэ' },
];

export default function LoginPage() {
  useDocumentTitle('Нэвтрэх');
  const { session, signIn, signInDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  if (session) return <Navigate to={ROLE_HOME[session.user.role]} replace />;

  const goHome = (role: UserRole) => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== '/' ? from : ROLE_HOME[role], { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setPending('form');
    try {
      const s = await signIn(identifier, password);
      goHome(s.user.role);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  const onDemo = async (role: UserRole) => {
    setPending(role);
    try {
      await signInDemo(role);
      navigate(ROLE_HOME[role], { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setPending(null);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-accent text-white lg:block">
        {/* Дэвсгэр зураг: public/brand/login-bg.jpg. Байхгүй бол зөвхөн өнгөн дэвсгэр харагдана */}
        {!bgFailed && (
          <img
            src={BRAND.loginBackground}
            alt=""
            aria-hidden
            onLoad={() => setBgLoaded(true)}
            onError={() => setBgFailed(true)}
            className={`absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-700 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {/* Текст тод уншигдахын тулд сургуулийн өнгөөр бүрхэнэ */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#17396E]/85 via-accent/55 to-[#0F2649]/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F2649]/45 via-transparent to-transparent" />

        <div className="relative flex h-full min-h-screen flex-col justify-between px-12 py-10">
          <div className="flex items-center gap-3.5">
            <BrandLogo size={48} tone="light" />
            <div className="leading-tight">
              <p className="text-[16px] font-semibold">{BRAND.name}</p>
              <p className="text-[12.5px] text-white/65">Сургалт, санхүүгийн систем</p>
            </div>
          </div>

          <div>
            <h1 className="max-w-md text-[34px] font-semibold leading-[1.15] tracking-[-0.02em] [text-shadow:0_1px_24px_rgba(10,25,50,0.35)]">
              Сургалт, санхүүгийн нэгдсэн систем
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/85 [text-shadow:0_1px_16px_rgba(10,25,50,0.4)]">
              Хоёр цогцолбор, есөн сургуулийн оюутан, багш, хичээл, дүн, төлбөрийн мэдээлэл нэг дор.
            </p>
          </div>

          <div>
            <ul className="grid grid-cols-1 gap-y-2 border-t border-white/20 pt-6 text-[13px] text-white/75">
              {SCHOOLS.map((s) => (
                <li key={s} className="truncate">{s}</li>
              ))}
            </ul>
            {bgLoaded && BRAND.loginBackgroundCredit && <p className="mt-5 text-[11px] text-white/45">Зураг: {BRAND.loginBackgroundCredit}</p>}
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandLogo size={40} tone="dark" />
            <span className="text-[15px] font-semibold">{BRAND.name}</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">Нэвтрэх</h2>
          <p className="mt-1.5 text-sm text-muted">Сургуулийн и-мэйл эсвэл оюутны кодоо ашиглана уу.</p>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
            <Input
              label="И-мэйл эсвэл оюутны код"
              autoComplete="username"
              placeholder="ST23SE001"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={env.useMock}
              required
            />
            <Input
              label="Нууц үг"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={env.useMock}
              required
            />
            {error && <p className="rounded-field bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
            <Button type="submit" variant="primary" className="mt-1 w-full" loading={pending === 'form'} disabled={env.useMock}>
              Нэвтрэх
            </Button>
          </form>

          {env.useMock && (
            <div className="mt-10">
              <div className="mb-3 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-xs text-faint">Туршилтын эрхээр нэвтрэх</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.role}
                    onClick={() => void onDemo(d.role)}
                    disabled={!!pending}
                    className="flex flex-col items-start rounded-field border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/40 disabled:opacity-60"
                  >
                    <span className="text-[13px] font-medium text-ink">{ROLE_LABEL[d.role]}</span>
                    <span className="text-xs text-faint">{pending === d.role ? 'Нэвтэрч байна…' : d.name}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-faint">
                Бодит өгөгдөлтэй холбохдоо <code className="rounded bg-ink/5 px-1">apps/web/.env</code> файлд <code className="rounded bg-ink/5 px-1">VITE_DATA_SOURCE=api</code> болгоно.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
