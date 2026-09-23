import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put } from '@/lib/api';
import type { UserRole } from '@/types/models';

export interface GradeRow {
  min: number;
  letter: string;
  point: number;
}
export interface SystemSettings {
  grading: { scale: GradeRow[] };
  security: { require_staff_mfa: boolean; single_session: boolean; single_session_roles: UserRole[] };
  finance: { auto_remind: boolean; remind_days_before: number; overdue_repeat_days: number };
  general: { university_name: string; academic_office_phone: string | null; support_email: string | null };
}

export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => get<SystemSettings>('/settings') });
export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: keyof SystemSettings; value: SystemSettings[keyof SystemSettings] }) => put<unknown>(`/settings/${key}`, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
