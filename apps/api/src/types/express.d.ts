import type { UserRole } from '../utils/constants';

export interface AuthUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  studentId: string | null;
  employeeId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
