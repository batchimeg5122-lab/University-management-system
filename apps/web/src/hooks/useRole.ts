import type { UserRole } from '@/types/models';
import { useAuth } from './useAuth';

/** 29-р хэсгийн эрхийн хүснэгтийг frontend талд тусгасан */
const WRITE: Record<string, UserRole[]> = {
  structure: ['super_admin', 'academic'],
  students: ['super_admin', 'academic'],
  teachers: ['super_admin', 'academic'],
  courses: ['super_admin', 'academic'],
  schedules: ['super_admin', 'academic'],
  grades_approve: ['super_admin', 'academic'],
  finance: ['super_admin', 'finance'],
  announcements: ['super_admin', 'academic', 'management'],
  users: ['super_admin'],
};

export type Permission = keyof typeof WRITE;

export function useRole() {
  const { session } = useAuth();
  const role = session?.user.role;
  return {
    role,
    is: (...roles: UserRole[]) => !!role && roles.includes(role),
    can: (perm: Permission) => !!role && WRITE[perm].includes(role),
  };
}
