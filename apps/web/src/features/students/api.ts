import { get, patch, post } from '@/lib/api';
import type { Enrollment, Invoice, StudentView } from '@/types/models';

export type StudentFilters = { q?: string; status?: string; class_id?: string; program_id?: string };
export type StudentDetail = { student: StudentView; enrollments: Enrollment[]; invoices: Invoice[]; attendance_rate: number };
export type StudentInput = Partial<StudentView> & { password?: string };
export type CreatedStudent = StudentView & { initial_password?: string | null };

export const studentsApi = {
  list: (params: StudentFilters) => get<StudentView[]>('/students', params),
  detail: (id: string) => get<StudentDetail>(`/students/${id}`),
  create: (body: StudentInput) => post<CreatedStudent>('/students', body),
  update: (id: string, body: StudentInput) => patch<StudentView>(`/students/${id}`, body),
};
