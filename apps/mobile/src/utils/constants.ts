import type {
  AttendanceStatus, CourseStatus, GradeStatus, InvoiceStatus, NotificationType, PaymentMethod, StudentStatus, SubjectType, UserRole,
} from '../types/models';

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Системийн админ',
  management: 'Удирдлага',
  academic: 'Сургалтын алба',
  finance: 'Санхүүгийн алба',
  teacher: 'Багш',
  student: 'Оюутан',
};

/** Mobile App зөвхөн эдгээр role-д */
export const MOBILE_ROLES: UserRole[] = ['student', 'teacher'];

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  active: 'Суралцаж буй',
  leave: 'Чөлөөтэй',
  graduated: 'Төгссөн',
  withdrawn: 'Гарсан',
  suspended: 'Түдгэлзсэн',
};

export const SUBJECT_TYPE_LABEL: Record<SubjectType, string> = { mandatory: 'Заавал', elective: 'Сонгон' };

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  planned: 'Төлөвлөсөн',
  active: 'Явагдаж буй',
  completed: 'Дууссан',
  cancelled: 'Цуцалсан',
};

export const GRADE_STATUS_LABEL: Record<GradeStatus, string> = {
  draft: 'Ноорог',
  submitted: 'Илгээсэн',
  approved: 'Баталгаажсан',
  rejected: 'Буцаагдсан',
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: 'Ирсэн',
  absent: 'Тасалсан',
  late: 'Хоцорсон',
  sick: 'Өвчтэй',
  excused: 'Чөлөөтэй',
};

export const ATTENDANCE_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'sick', 'excused'];

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: 'Төлөөгүй',
  partial: 'Хэсэгчлэн төлсөн',
  paid: 'Төлөгдсөн',
  cancelled: 'Цуцалсан',
  overdue: 'Хугацаа хэтэрсэн',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Бэлэн',
  bank_transfer: 'Банкны шилжүүлэг',
  card: 'Карт',
  qpay: 'QPay',
  other: 'Бусад',
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  general: 'Ерөнхий',
  grade: 'Дүн',
  attendance: 'Ирц',
  schedule: 'Хуваарь',
  finance: 'Төлбөр',
  announcement: 'Зарлал',
};

export const SESSION_TYPE_LABEL: Record<string, string> = {
  lecture: 'Лекц',
  seminar: 'Семинар',
  lab: 'Лаборатори',
  exam: 'Шалгалт',
};

export const DAY_LABEL: Record<number, string> = {
  1: 'Даваа', 2: 'Мягмар', 3: 'Лхагва', 4: 'Пүрэв', 5: 'Баасан', 6: 'Бямба', 7: 'Ням',
};

export const DAY_SHORT: Record<number, string> = {
  1: 'Да', 2: 'Мя', 3: 'Лх', 4: 'Пү', 5: 'Ба', 6: 'Бя', 7: 'Ня',
};

export const CERT_PURPOSE: Record<string, string> = {
  bank: 'Банк, зээлийн байгууллагад',
  military: 'Цэргийн бүртгэлд',
  visa: 'Виз, гадаад паспортад',
  work: 'Ажлын байранд',
  social: 'Нийгмийн даатгал, халамжид',
  dormitory: 'Дотуур байранд',
  other: 'Бусад',
};

/** Нийт оноо → үсгэн үнэлгээ, голч оноо (web/API-тай ижил) */
export const GRADE_SCALE: { min: number; letter: string; point: number }[] = [
  { min: 96, letter: 'A', point: 4.0 },
  { min: 91, letter: 'A-', point: 3.7 },
  { min: 88, letter: 'B+', point: 3.3 },
  { min: 84, letter: 'B', point: 3.0 },
  { min: 80, letter: 'B-', point: 2.7 },
  { min: 77, letter: 'C+', point: 2.3 },
  { min: 74, letter: 'C', point: 2.0 },
  { min: 70, letter: 'C-', point: 1.7 },
  { min: 67, letter: 'D+', point: 1.3 },
  { min: 64, letter: 'D', point: 1.0 },
  { min: 60, letter: 'D-', point: 0.7 },
  { min: 0, letter: 'F', point: 0 },
];

/** Материалын зөвшөөрөгдсөн төрлүүд (API-ийн ALLOWED_MIME-тай ижил) */
export const MATERIAL_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
];

export const MATERIAL_MAX_SIZE = 50 * 1024 * 1024;

export const EXAM_TYPE_LABEL: Record<string, string> = {
  quiz: 'Сорил',
  midterm: 'Дунд шалгалт',
  final: 'Эцсийн шалгалт',
  retake: 'Нөхөн шалгалт',
  other: 'Шалгалт',
};
