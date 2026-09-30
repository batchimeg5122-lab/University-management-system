// v3 schema-тай нийцсэн төрлүүд.
// Дараа нь packages/shared руу зөөж, `supabase gen types`-оор солих боломжтой.

export type UserRole = 'super_admin' | 'management' | 'academic' | 'finance' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type StudentStatus = 'active' | 'leave' | 'graduated' | 'withdrawn' | 'suspended';
export type EmployeeType = 'teacher' | 'academic' | 'finance' | 'management' | 'admin';
export type DepartmentLevel = 'campus' | 'school' | 'department';
export type SubjectType = 'mandatory' | 'elective';
export type CourseStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'enrolled' | 'dropped' | 'completed';
export type GradeStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'sick' | 'excused';
export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'cancelled' | 'overdue';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'qpay' | 'other';
export type NotificationType = 'general' | 'grade' | 'attendance' | 'schedule' | 'finance' | 'announcement';

export interface Department {
  id: string;
  parent_id: string | null;
  level: DepartmentLevel;
  name: string;
  code: string | null;
  head_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface Program {
  id: string;
  department_id: string;
  name: string;
  code: string | null;
  degree: string | null;
  duration_years: number | null;
  total_credits: number | null;
  is_active: boolean;
  department_name?: string;
}

export interface Semester {
  id: string;
  academic_year: string;
  name: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface ClassGroup {
  id: string;
  program_id: string;
  advisor_id: string | null;
  name: string;
  code: string;
  year_level: number;
  program_name?: string;
  advisor_name?: string | null;
  student_count?: number;
}

export interface AppUser {
  id: string;
  role: UserRole;
  email: string | null;
  last_name: string;
  first_name: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  student_code: string;
  register_number: string | null;
  class_id: string | null;
  program_id: string | null;
  enrollment_year: number | null;
  gpa: number | null;
  earned_credits: number;
  status: StudentStatus;
}

/** v_students view */
export interface StudentView extends Student {
  last_name: string;
  first_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  class_name: string | null;
  program_name: string | null;
  department_name: string | null;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_code: string;
  employee_type: EmployeeType;
  department_id: string | null;
  position: string | null;
  specialization: string | null;
  academic_degree: string | null;
  hired_at: string | null;
  is_active: boolean;
}

/** v_employees view */
export interface EmployeeView extends Employee {
  last_name: string;
  first_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  department_name: string | null;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credit: number;
  department_id: string | null;
  program_id: string | null;
  subject_type: SubjectType;
  description: string | null;
  is_active: boolean;
  department_name?: string | null;
}

export interface Course {
  id: string;
  subject_id: string;
  semester_id: string;
  teacher_id: string | null;
  class_id: string | null;
  section: string | null;
  max_students: number | null;
  status: CourseStatus;
  subject_code?: string;
  subject_name?: string;
  credit?: number;
  teacher_name?: string | null;
  class_name?: string | null;
  semester_name?: string;
  student_count?: number;
}

export interface GradeItem {
  id: string;
  course_id: string;
  name: string;
  max_score: number;
  weight: number | null;
  sort_order: number;
}

export interface Enrollment {
  id: string;
  course_id: string;
  student_id: string;
  status: EnrollmentStatus;
  scores: Record<string, number>;
  total_score: number | null;
  letter_grade: string | null;
  gpa_point: number | null;
  grade_status: GradeStatus;
  submitted_at: string | null;
  approved_at: string | null;
  student_code?: string;
  student_name?: string;
  subject_name?: string;
  subject_code?: string;
  credit?: number;
  teacher_name?: string | null;
  class_name?: string | null;
  semester_name?: string;
  /** Баталгаажаагүй үеийн явцын оноо (зөвхөн /grades/me) */
  progress?: GradeProgress;
}

/** schedules table-ийн мөр */
export interface ScheduleRecord {
  id: string;
  course_id: string;
  session_type?: 'lecture' | 'seminar' | 'lab' | 'exam';
  is_online?: boolean;
  group_id?: string | null;
  note?: string | null;
  room: string | null;
  building: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

/** API-аас ирэх хуваарь (courses JOIN-той) */
export interface Schedule extends ScheduleRecord {
  session_type?: 'lecture' | 'seminar' | 'lab' | 'exam';
  is_online?: boolean;
  /** Нэгдсэн лекцийн бүлэг */
  group_id?: string | null;
  note?: string | null;
  student_count?: number;
  // JOIN (давхцал шалгах, шүүхэд хэрэгтэй)
  semester_id?: string;
  class_id: string | null;
  teacher_id: string | null;
  subject_code?: string;
  subject_name?: string;
  teacher_name?: string | null;
  class_name?: string | null;
  /** Ойрын хугацаанд цуцлагдсан өдрүүд */
  cancellations?: ClassCancellation[];
  /** Өнөөдрийн хичээл цуцлагдсан эсэх */
  cancelled_today?: boolean;
}

/** Багш тухайн өдрийн хичээлээ цуцалсан бичлэг */
export interface ClassCancellation {
  cancel_date: string;
  reason: string | null;
}

/** Цуцлагдсан хичээлийн дэлгэрэнгүй */
export interface ClassCancellationRow extends ClassCancellation {
  id: string;
  schedule_id: string;
  course_id: string;
  created_at: string;
  cancelled_by_name: string | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  room: string | null;
  building: string | null;
  is_online: boolean;
  subject_code: string | null;
  subject_name: string | null;
  class_name: string | null;
  teacher_name: string | null;
}

export interface ScheduleConflict {
  kind: 'class' | 'teacher' | 'room';
  a: Schedule;
  b: Schedule;
}

export interface Attendance {
  id: string;
  course_id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  note: string | null;
  subject_name?: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  semester_id: string | null;
  invoice_number: string;
  tuition_amount: number;
  discount_amount: number;
  discount_note: string | null;
  net_amount: number;
  paid_amount: number;
  due_date: string | null;
  status: InvoiceStatus;
  description: string | null;
  created_at: string;
  student_code?: string;
  student_name?: string;
  semester_name?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  student_id: string;
  amount: number;
  method: PaymentMethod;
  transaction_reference: string | null;
  payment_date: string;
  description: string | null;
  /** Төлбөр төлсөн баримтын дугаар — RCP-YYYY-00001 */
  receipt_no?: string | null;
  invoice_number?: string;
  student_name?: string;
  student_code?: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  target_role: UserRole | null;
  title: string;
  message: string;
  type: NotificationType;
  image_url: string | null;
  is_read: boolean;
  is_published: boolean;
  publish_at: string | null;
  expire_at: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name?: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  /** WEB / MOBILE (API тооцоолно) */
  source?: 'WEB' | 'MOBILE';
  created_at: string;
}

/** Админд харагдах хэрэглэгчийн бүрэн мэдээлэл */
export interface UserDetail {
  user: AppUser;
  student: StudentView | null;
  employee: EmployeeView | null;
  auth: {
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    must_change_password: boolean;
    banned_until: string | null;
  } | null;
}

export interface CourseMaterial {
  id: string;
  course_id: string;
  uploaded_by: string | null;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  // JOIN
  can_preview?: boolean;
  uploaded_by_name?: string | null;
  subject_code?: string;
  subject_name?: string;
  class_name?: string | null;
}

export interface MaterialStats {
  total_students: number;
  by_material: Record<string, { students: number; downloads: number }>;
}

export interface MaterialAccessRow {
  student_id: string;
  student_code: string;
  student_name: string;
  downloaded: boolean;
  download_count: number;
  first_at: string | null;
  last_at: string | null;
}

export interface MaterialAccessDetail {
  material: { id: string; title: string };
  total_students: number;
  downloaded_count: number;
  students: MaterialAccessRow[];
}

export interface GradeProgress {
  items: { id: string; name: string; max_score: number; score: number | null }[];
  earned: number;
  graded_max: number;
  total_max: number;
  percent: number | null;
  collected_percent: number | null;
  remaining_max: number;
}

export interface StudentCertificate {
  id: string;
  student_id: string;
  number: string;
  verify_code: string;
  purpose: string;
  purpose_note: string | null;
  include_gpa: boolean;
  snapshot: {
    full_name: string;
    last_name: string;
    first_name: string;
    student_code: string;
    register_number: string | null;
    program_name: string | null;
    department_name: string | null;
    class_name: string | null;
    year_level: number | null;
    enrollment_year: number | null;
    status: string;
    semester: string | null;
    course_count: number;
    gpa: number | null;
    earned_credits: number | null;
  };
  issued_at: string;
  valid_until: string | null;
  revoked_at: string | null;
  is_valid: boolean;
  student_code?: string;
  student_name?: string;
}

export interface Session {
  user: AppUser;
  student: StudentView | null;
  employee: EmployeeView | null;
}
