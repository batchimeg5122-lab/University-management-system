import { get } from './client';
import type { StudentCardData } from '../types/models';

export const studentCardApi = {
  /** Үнэмлэхийн мэдээлэл + 10 минутын хүчинтэй QR token */
  mine: () => get<StudentCardData>('/student-card/me'),
};
