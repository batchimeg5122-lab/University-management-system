import { get, patch, post } from '@/lib/api';
import type { Program } from '@/types/models';

export const programsApi = {
  list: (params?: { department_id?: string }) => get<Program[]>('/programs', params),
  create: (body: Partial<Program>) => post<Program>('/programs', body),
  update: (id: string, body: Partial<Program>) => patch<Program>(`/programs/${id}`, body),
};
