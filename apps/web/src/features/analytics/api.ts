import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

export type RiskLevel = 'high' | 'medium' | 'low';
export interface RiskRow {
  student_id: string;
  student_code: string;
  full_name: string;
  class_name: string | null;
  program_name: string | null;
  advisor_id: string | null;
  gpa: number | null;
  attendance_rate: number | null;
  attendance_records: number;
  progress_pct: number | null;
  f_count: number;
  overdue_amount: number;
  overdue_days: number;
  score: number;
  level: RiskLevel;
  reasons: string[];
}
export interface RiskReport {
  semester_id: string | null;
  generated_at: string;
  summary: { students: number; high: number; medium: number; low: number };
  rows: RiskRow[];
}

export interface TrendSemester {
  semester_id: string;
  label: string;
  enrollments: number;
  courses: number;
  attendance_rate: number | null;
  avg_gpa: number | null;
  graded: number;
  fail_rate: number | null;
  invoiced: number;
  collected: number;
  collection_rate: number | null;
}
export interface Trends {
  generated_at: string;
  semesters: TrendSemester[];
  intake: { year: number; total: number; active: number; withdrawn: number; retention: number | null }[];
}

export interface WeeklyReport {
  summary: {
    period: { from: string; to: string };
    students: number;
    attendance: { records: number; rate: number | null };
    grades_awaiting_approval: number;
    finance: { collected_7d: number; payments_7d: number; overdue_debt: number; overdue_invoices: number };
    risk: { high: number; medium: number } | null;
  };
  html: string;
  smtp: boolean;
}

export const analyticsApi = {
  atRisk: (semester_id?: string) => get<RiskReport>('/analytics/at-risk', { semester_id }),
  notify: (student_ids: string[]) => post<{ advisors: number; students: number; without_advisor: number }>('/analytics/at-risk/notify', { student_ids }),
  trends: (fresh = false) => get<Trends>('/analytics/trends', fresh ? { fresh: 'true' } : {}),
  weekly: () => get<WeeklyReport>('/analytics/weekly'),
  sendWeekly: (to?: string[]) => post<{ sent: number; recipients: string[] }>('/analytics/weekly/send', { to }),
};

export const useAtRisk = (semesterId?: string) => useQuery({ queryKey: ['at-risk', semesterId], queryFn: () => analyticsApi.atRisk(semesterId), staleTime: 5 * 60_000 });
export const useTrends = () => useQuery({ queryKey: ['trends'], queryFn: () => analyticsApi.trends(), staleTime: 10 * 60_000 });
export const useWeeklyReport = () => useQuery({ queryKey: ['weekly-report'], queryFn: analyticsApi.weekly });
export const useNotifyAdvisors = () => useMutation({ mutationFn: analyticsApi.notify });
export const useSendWeekly = () => useMutation({ mutationFn: analyticsApi.sendWeekly });
