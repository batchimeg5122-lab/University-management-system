export interface OverviewReport {
  total_students: number;
  total_teachers: number;
  total_schools: number;
  total_subjects: number;
  active_courses: number;
  avg_gpa: number;
  avg_attendance: number;
  collection_rate: number;
}

export interface SchoolReport {
  id: string;
  name: string;
  students: number;
  teachers: number;
  classes: number;
  programs: number;
  avg_gpa: number;
  avg_attendance: number;
}

export interface DepartmentReport {
  id: string;
  name: string;
  students: number;
  teachers: number;
  subjects: number;
  classes: number;
  avg_gpa: number;
  avg_attendance: number;
}

export type LetterBucket = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CourseStats {
  course_id: string;
  student_count: number;
  graded_count: number;
  avg_attendance: number;
  avg_score: number;
  distribution: Record<LetterBucket, number>;
  attendance_by_status: Record<string, number>;
}

export interface FinanceReport {
  total_billed: number;
  total_discount: number;
  total_paid: number;
  total_outstanding: number;
  by_status: Record<string, number>;
  by_method: Record<string, number>;
  by_school: { name: string; billed: number; paid: number }[];
}

export interface StudentSummary {
  gpa: number | null;
  semester_gpa: number | null;
  earned_credits: number;
  attendance_rate: number;
  balance: number;
  course_count: number;
}
