import type { UserRole } from '../utils/constants';

export interface AuthUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  studentId: string | null;
  employeeId: string | null;
  /** Supabase JWT-ийн баталгаажуулалтын түвшин: aal1 (нууц үг), aal2 (2FA) */
  aal?: 'aal1' | 'aal2';
  /** Supabase session-ийн дугаар (нэг платформ = нэг session шалгахад) */
  sessionId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
