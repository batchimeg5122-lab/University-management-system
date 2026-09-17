import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Нэвтэрсэн гэдэг нь баталгаатай хуудсанд ашиглана */
export function useSession() {
  const { session } = useAuth();
  if (!session) throw new Error('Session байхгүй байна');
  return session;
}
