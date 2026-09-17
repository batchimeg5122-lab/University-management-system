import { get, patch, post } from '@/lib/api';
import type { AppUser, EmployeeView, StudentView, UserDetail } from '@/types/models';

export type UserFilters = { q?: string; role?: string; status?: string };

export type UserUpdateInput = Partial<Pick<AppUser, 'last_name' | 'first_name' | 'email' | 'phone' | 'role' | 'status'>> & {
  student?: Partial<Pick<StudentView, 'student_code' | 'register_number' | 'class_id' | 'enrollment_year' | 'status'>>;
  employee?: Partial<Pick<EmployeeView, 'employee_code' | 'employee_type' | 'department_id' | 'position' | 'specialization' | 'academic_degree' | 'is_active'>>;
};

export type CreatedUser = AppUser & { initial_password?: string | null };
export type ResetPasswordResult = { password: string | null; must_change_password: boolean };

export const usersApi = {
  list: (params?: UserFilters) => get<AppUser[]>('/users', params),
  detail: (id: string) => get<UserDetail>(`/users/${id}`),
  create: (body: Partial<AppUser> & { password?: string }) => post<CreatedUser>('/users', body),
  update: (id: string, body: UserUpdateInput) => patch<UserDetail & { changed: string[] }>(`/users/${id}`, body),
  resetPassword: (id: string, body: { password?: string; must_change: boolean }) => post<ResetPasswordResult>(`/users/${id}/password`, body),
  confirmEmail: (id: string) => post<{ already_confirmed: boolean; email_confirmed_at: string }>(`/users/${id}/confirm-email`),
  confirmAllEmails: () => post<{ confirmed: number; failed: string[] }>('/users/confirm-emails'),
};
