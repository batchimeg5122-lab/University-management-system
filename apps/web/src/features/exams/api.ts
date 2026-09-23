import { del, get, patch, post } from '@/lib/api';

export type ExamType = 'quiz' | 'midterm' | 'final' | 'retake' | 'other';

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  quiz: 'Сорил',
  midterm: 'Дунд шалгалт',
  final: 'Эцсийн шалгалт',
  retake: 'Нөхөн шалгалт',
  other: 'Бусад',
};

export interface Exam {
  id: string;
  course_id: string;
  title: string | null;
  exam_type: ExamType;
  exam_date: string;
  start_time: string;
  end_time: string;
  building: string | null;
  room: string | null;
  is_online: boolean;
  note: string | null;
  subject_code?: string;
  subject_name?: string;
  class_name?: string | null;
  teacher_name?: string | null;
}

export type ExamInput = Omit<Exam, 'id' | 'subject_code' | 'subject_name' | 'class_name' | 'teacher_name'>;

export const examsApi = {
  list: (params: { semester_id?: string; course_id?: string; upcoming?: boolean } = {}) => get<Exam[]>('/exams', params),
  create: (body: ExamInput) => post<Exam>('/exams', body),
  update: (id: string, body: Partial<ExamInput>) => patch<Exam>(`/exams/${id}`, body),
  remove: (id: string) => del<{ deleted: boolean }>(`/exams/${id}`),
};
