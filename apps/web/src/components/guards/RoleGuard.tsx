import { Navigate, Outlet } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_HOME } from '@/lib/constants';
import type { UserRole } from '@/types/models';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/** super_admin бүх хуудсанд нэвтэрнэ */
export function RoleGuard({ roles }: { roles: UserRole[] }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  const role = session.user.role;
  if (role !== 'super_admin' && !roles.includes(role)) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Энэ хуудсанд хандах эрх алга"
        description="Таны эрхэд энэ хэсэг хамаарахгүй байна. Шаардлагатай бол системийн админд хандана уу."
        action={
          <Button variant="primary" onClick={() => (window.location.href = ROLE_HOME[role])}>
            Нүүр хуудас руу очих
          </Button>
        }
      />
    );
  }
  return <Outlet />;
}
