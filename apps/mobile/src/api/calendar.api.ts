import { get } from './client';
import type { AcademicEvent } from '../types/models';

export const calendarApi = {
  list: (from: string, to: string) => get<AcademicEvent[]>('/calendar', { from, to }),
};
