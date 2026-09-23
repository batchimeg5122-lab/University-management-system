import { get } from './client';
import type { Exam } from '../types/models';

export const examApi = {
  /** Оюутан: бүртгэлтэй хичээл, багш: өөрийн хичээлийн шалгалт */
  list: (upcoming = true) => get<Exam[]>('/exams', upcoming ? { upcoming: 'true' } : {}),
};
