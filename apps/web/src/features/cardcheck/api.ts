import { get, post } from '@/lib/api';
import type { StudentStatus } from '@/types/models';

export interface CardCheckResult {
  valid: boolean;
  reason: 'ok' | 'invalid' | 'expired_qr' | 'inactive' | 'expired_card';
  checked_at: string;
  card: {
    full_name: string;
    last_name: string;
    first_name: string;
    student_code: string;
    program_name: string | null;
    department_name: string | null;
    school_name: string | null;
    class_name: string | null;
    year_level: number | null;
    status: StudentStatus;
    avatar_url: string | null;
    valid_until: string | null;
  } | null;
}

export interface CardCheckRow {
  id: string;
  valid: boolean;
  reason: string;
  location: string | null;
  student_code: string | null;
  student_name: string | null;
  checked_by_name: string | null;
  created_at: string;
}

export const cardCheckApi = {
  check: (token: string, location: string) => post<CardCheckResult>('/student-card/check', { token, location }),
  history: () => get<{ rows: CardCheckRow[]; today: { total: number; valid: number; invalid: number } }>('/student-card/checks', { limit: 100 }),
};

export const REASON_TEXT: Record<string, string> = {
  ok: 'Хүчинтэй',
  invalid: 'Хуурамч / буруу QR',
  expired_qr: 'QR хугацаа дууссан',
  inactive: 'Оюутан идэвхгүй',
  expired_card: 'Үнэмлэхийн хугацаа дууссан',
};
