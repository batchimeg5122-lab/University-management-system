import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_HOME } from '@/lib/constants';

export default function NotFoundPage() {
  const { session } = useAuth();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="num text-5xl font-semibold tracking-tight text-ink/15">404</p>
      <h1 className="mt-4 text-lg font-semibold text-ink">Хуудас олдсонгүй</h1>
      <p className="mt-1 text-sm text-muted">Хаяг буруу эсвэл хуудас устгагдсан байж болно.</p>
      <Link to={session ? ROLE_HOME[session.user.role] : '/login'} className="mt-6 text-sm font-medium text-accent hover:underline">
        Нүүр хуудас руу буцах
      </Link>
    </div>
  );
}
