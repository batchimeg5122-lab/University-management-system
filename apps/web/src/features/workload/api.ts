import { get } from '@/lib/api';

export type SessionKind = 'lecture' | 'seminar' | 'lab' | 'exam';

export interface WorkloadCourseRow {
  course_id: string;
  subject_code: string | null;
  subject_name: string | null;
  class_name: string | null;
  credit: number | null;
  student_count: number;
  /** Долоо хоногт: төрөл тус бүрийн академик цаг */
  weekly: Record<SessionKind, number>;
  weekly_total: number;
  weekly_minutes: number;
  semester_total: number;
  session_count: number;
  cancelled_count: number;
}

export interface WorkloadReport {
  teacher: { id: string; name: string | null; position: string | null; department: string | null } | null;
  semester: { id: string; label: string; start_date: string | null; end_date: string | null } | null;
  weeks: number;
  /** Нэг академик цагийн минут (40) */
  academic_minutes: number;
  rows: WorkloadCourseRow[];
  totals: {
    courses: number;
    classes: number;
    students: number;
    credits: number;
    weekly_hours: number;
    weekly_minutes: number;
    semester_hours: number;
    sessions: number;
    cancelled: number;
    by_type: Record<SessionKind, number>;
  };
}

export interface TeacherLoadRow {
  teacher_id: string;
  teacher_name: string | null;
  courses: number;
  classes: number;
  students: number;
  credits: number;
  weekly_hours: number;
}

export type WorkloadParams = { teacher_id?: string; semester_id?: string; weeks?: number };

export const workloadApi = {
  /** Багш — өөрийн; алба/удирдлага — teacher_id-аар */
  report: (params: WorkloadParams = {}) => get<WorkloadReport>('/teacher/workload', params),
  /** Бүх багшийн ачааллын хураангуй (алба, удирдлага) */
  byTeacher: (params: WorkloadParams = {}) => get<TeacherLoadRow[]>('/teacher/workload/all', params),
};

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  lecture: 'Лекц',
  seminar: 'Семинар',
  lab: 'Лаборатори',
  exam: 'Шалгалт',
};
