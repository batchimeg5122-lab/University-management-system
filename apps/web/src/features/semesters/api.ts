import { get, post } from '@/lib/api';
import type { Semester } from '@/types/models';

export const semestersApi = {
  list: () => get<Semester[]>('/semesters'),
  current: () => get<Semester | null>('/semesters/current'),
  create: (body: Partial<Semester>) => post<Semester>('/semesters', body),
  setCurrent: (id: string) => post<Semester>(`/semesters/${id}/set-current`),
};
