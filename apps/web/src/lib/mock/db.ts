/**
 * Туршилтын өгөгдлийн сан.
 * v3 schema-гийн 16 table-ийг санах ойд дуурайлгана. VITE_USE_MOCK=true үед ашиглагдана.
 * Seed тогтмол тул дахин ачаалахад ижил өгөгдөл үүснэ.
 */
import type {
  AppUser, Attendance, AttendanceStatus, AuditLog, ClassGroup, Course, Department, Employee,
  EmployeeType, Enrollment, GradeItem, Invoice, Notification, Payment, PaymentMethod, Program,
  ScheduleRecord, Semester, Student, Subject, UserRole, CourseMaterial,
} from '@/types/models';
import { scoreToGrade } from '../gpa';
import { toISODate } from '../utils';

// ---------------------------------------------------------------------------
// Seeded random
// ---------------------------------------------------------------------------
let seed = 20260916;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const pad = (n: number, w = 3) => String(n).padStart(w, '0');

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------
export const db = {
  departments: [] as Department[],
  programs: [] as Program[],
  semesters: [] as Semester[],
  classes: [] as ClassGroup[],
  users: [] as AppUser[],
  students: [] as Student[],
  employees: [] as Employee[],
  subjects: [] as Subject[],
  courses: [] as Course[],
  grade_items: [] as GradeItem[],
  enrollments: [] as Enrollment[],
  schedules: [] as ScheduleRecord[],
  attendance: [] as Attendance[],
  invoices: [] as Invoice[],
  payments: [] as Payment[],
  notifications: [] as Notification[],
  audit_logs: [] as AuditLog[],
  course_materials: [] as CourseMaterial[],
  student_certificates: [] as any[],
  rooms: [] as { id: string; building: string; code: string; capacity: number; room_type: string; note: string | null; is_active: boolean }[],
  material_access: [] as { id: string; material_id: string; student_id: string; download_count: number; first_at: string; last_at: string }[],
};

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;

// ---------------------------------------------------------------------------
// 1. Departments (campus → school → department)
// ---------------------------------------------------------------------------
function dept(id: string, parent: string | null, level: Department['level'], name: string, code: string, head: string | null = null): Department {
  const d: Department = { id, parent_id: parent, level, name, code, head_name: head, phone: null, email: null, is_active: true };
  db.departments.push(d);
  return d;
}

dept('cmp-1', null, 'campus', 'Чингис Хаан цогцолбор', 'CH');
dept('cmp-2', null, 'campus', 'Чингис Соосэ цогцолбор', 'CS');

const SCHOOLS: [string, string, string, string][] = [
  ['sch-law', 'cmp-1', 'Хууль зүйн сургууль', 'LAW'],
  ['sch-eng', 'cmp-1', 'Үндэсний инженер технологийн сургууль', 'NET'],
  ['sch-med', 'cmp-1', 'Анагаах ухааны сургууль', 'MED'],
  ['sch-fin', 'cmp-1', 'Санхүү эдийн засгийн сургууль', 'FIN'],
  ['sch-soo', 'cmp-2', 'Чингис Соосэ сургууль', 'SOO'],
  ['sch-sec', 'cmp-1', 'Аюулгүй байдал, хууль сахиулахын сургууль', 'SEC'],
  ['sch-sci', 'cmp-1', 'Шинжлэх ухааны сургууль', 'SCI'],
  ['sch-hum', 'cmp-1', 'Хүмүүнлэгийн ухааны сургууль', 'HUM'],
  ['sch-poly', 'cmp-1', 'Их Засаг Политехник коллеж', 'POLY'],
];
SCHOOLS.forEach(([id, parent, name, code]) => dept(id, parent, 'school', name, code));

const DEPTS: [string, string, string, string][] = [
  ['dep-se', 'sch-eng', 'Програм хангамжийн тэнхим', 'NET-SE'],
  ['dep-it', 'sch-eng', 'Мэдээллийн технологийн тэнхим', 'NET-IT'],
  ['dep-law', 'sch-law', 'Эрх зүйн тэнхим', 'LAW-LW'],
  ['dep-med', 'sch-med', 'Суурь анагаахын тэнхим', 'MED-BM'],
  ['dep-acc', 'sch-fin', 'Санхүү, нягтлан бодохын тэнхим', 'FIN-AC'],
  ['dep-eco', 'sch-fin', 'Эдийн засгийн тэнхим', 'FIN-EC'],
  ['dep-kor', 'sch-soo', 'Солонгос хэлний тэнхим', 'SOO-KR'],
  ['dep-pol', 'sch-sec', 'Хууль сахиулахын тэнхим', 'SEC-PL'],
  ['dep-math', 'sch-sci', 'Математикийн тэнхим', 'SCI-MT'],
  ['dep-lang', 'sch-hum', 'Англи хэлний тэнхим', 'HUM-EN'],
  ['dep-tech', 'sch-poly', 'Техникийн тэнхим', 'POLY-TC'],
];
DEPTS.forEach(([id, parent, name, code]) => dept(id, parent, 'department', name, code));

// ---------------------------------------------------------------------------
// 2. Programs
// ---------------------------------------------------------------------------
const PROGRAMS: [string, string, string, string, string, number, number][] = [
  ['prg-se', 'dep-se', 'Програм хангамж', 'SE', 'Бакалавр', 4, 130],
  ['prg-is', 'dep-it', 'Мэдээллийн систем', 'IS', 'Бакалавр', 4, 130],
  ['prg-law', 'dep-law', 'Эрх зүй', 'LW', 'Бакалавр', 4, 136],
  ['prg-med', 'dep-med', 'Эмчилгээний эмч', 'MD', 'Бакалавр', 6, 240],
  ['prg-acc', 'dep-acc', 'Нягтлан бодох бүртгэл', 'AC', 'Бакалавр', 4, 130],
  ['prg-eco', 'dep-eco', 'Эдийн засаг', 'EC', 'Бакалавр', 4, 130],
  ['prg-kor', 'dep-kor', 'Солонгос хэл, орчуулга', 'KR', 'Бакалавр', 4, 128],
  ['prg-pol', 'dep-pol', 'Цагдаагийн ажил', 'PL', 'Бакалавр', 4, 132],
  ['prg-math', 'dep-math', 'Хэрэглээний математик', 'MT', 'Бакалавр', 4, 130],
  ['prg-eng', 'dep-lang', 'Англи хэлний орчуулга', 'EN', 'Бакалавр', 4, 128],
  ['prg-elec', 'dep-tech', 'Цахилгааны технологи', 'ET', 'Диплом', 3, 96],
];
PROGRAMS.forEach(([id, department_id, name, code, degree, duration_years, total_credits]) =>
  db.programs.push({ id, department_id, name, code, degree, duration_years, total_credits, is_active: true }),
);

// ---------------------------------------------------------------------------
// 3. Semesters
// ---------------------------------------------------------------------------
db.semesters.push(
  { id: 'sem-2025-1', academic_year: '2025-2026', name: 'Намрын улирал', semester_number: 1, start_date: '2025-09-01', end_date: '2025-12-24', is_current: false },
  { id: 'sem-2025-2', academic_year: '2025-2026', name: 'Хаврын улирал', semester_number: 2, start_date: '2026-01-26', end_date: '2026-05-29', is_current: false },
  { id: 'sem-2026-1', academic_year: '2026-2027', name: 'Намрын улирал', semester_number: 1, start_date: '2026-09-01', end_date: '2026-12-21', is_current: true },
  { id: 'sem-2026-2', academic_year: '2026-2027', name: 'Хаврын улирал', semester_number: 2, start_date: '2027-01-25', end_date: '2027-05-28', is_current: false },
);
export const CURRENT_SEMESTER_ID = 'sem-2026-1';
const PREV_SEMESTER_ID = 'sem-2025-2';

// ---------------------------------------------------------------------------
// 4. Users helpers
// ---------------------------------------------------------------------------
const LAST_NAMES = ['Батсүх', 'Дамдин', 'Ганбаатар', 'Цэрэн', 'Даваа', 'Пүрэв', 'Лхагва', 'Баасан', 'Нямдорж', 'Энхбаяр', 'Мөнхбат', 'Эрдэнэ', 'Гантулга', 'Сүхбаатар', 'Отгонбаяр', 'Жаргал', 'Болд', 'Төмөр', 'Алтангэрэл', 'Нарантуяа', 'Батжаргал', 'Чулуун', 'Буянтогтох', 'Хүрэлбаатар', 'Ганзориг'];
const MALE = ['Тэмүүлэн', 'Билгүүн', 'Анужин', 'Хүслэн', 'Мөнх-Эрдэнэ', 'Энхжин', 'Тэлмүүн', 'Ариунболд', 'Сэргэлэн', 'Амарбаясгалан', 'Төгөлдөр', 'Баярсайхан', 'Дөлгөөн', 'Очир', 'Номин', 'Сараа', 'Уянга', 'Хонгор', 'Мишээл', 'Гэрэлт', 'Ундрах', 'Оюу', 'Эгшиглэн', 'Золбоо', 'Цэлмэг', 'Хулан', 'Ананд', 'Тэнгис', 'Индра', 'Солонго'];

let userSeq = 0;
function makeUser(role: UserRole, last: string, first: string, emailPrefix?: string): AppUser {
  userSeq++;
  const u: AppUser = {
    id: `usr-${pad(userSeq, 4)}`,
    role,
    email: `${emailPrefix ?? `user${pad(userSeq, 4)}`}@ikhzasag.edu.mn`,
    last_name: last,
    first_name: first,
    full_name: `${last} ${first}`,
    phone: `99${pad(Math.floor(rand() * 999999), 6)}`,
    avatar_url: null,
    status: 'active',
    created_at: '2025-08-20T09:00:00Z',
  };
  db.users.push(u);
  return u;
}

let empSeq = 0;
function makeEmployee(user: AppUser, type: EmployeeType, department_id: string | null, position: string, specialization: string | null = null, degree: string | null = null): Employee {
  empSeq++;
  const e: Employee = {
    id: `emp-${pad(empSeq)}`,
    user_id: user.id,
    employee_code: `EMP${pad(empSeq, 4)}`,
    employee_type: type,
    department_id,
    position,
    specialization,
    academic_degree: degree,
    hired_at: `20${pad(10 + Math.floor(rand() * 14), 2)}-09-01`,
    is_active: true,
  };
  db.employees.push(e);
  return e;
}

// Staff (demo нэвтрэлт)
export const DEMO_USERS: Record<UserRole, string> = {} as Record<UserRole, string>;

const admin = makeUser('super_admin', 'Ганбаатар', 'Мөнх-Эрдэнэ', 'admin');
makeEmployee(admin, 'admin', null, 'Системийн администратор');
DEMO_USERS.super_admin = admin.id;

const mgmt = makeUser('management', 'Цэрэн', 'Оюунчимэг', 'rector');
makeEmployee(mgmt, 'management', null, 'Сургалт эрхэлсэн дэд захирал', null, 'Доктор (Ph.D)');
DEMO_USERS.management = mgmt.id;

const acad = makeUser('academic', 'Даваа', 'Сарангэрэл', 'surgalt');
makeEmployee(acad, 'academic', null, 'Сургалтын албаны мэргэжилтэн');
DEMO_USERS.academic = acad.id;

const fin = makeUser('finance', 'Пүрэв', 'Энхтуяа', 'sankhuu');
makeEmployee(fin, 'finance', null, 'Ерөнхий нягтлан бодогч');
DEMO_USERS.finance = fin.id;

// Teachers
const TEACHERS: [string, string, string, string, string][] = [
  ['Батсүх', 'Бат', 'dep-se', 'Веб, програм хангамжийн инженерчлэл', 'Магистр'],
  ['Дамдин', 'Дорж', 'dep-se', 'Өгөгдлийн сан', 'Доктор (Ph.D)'],
  ['Лхагва', 'Ууганбаяр', 'dep-it', 'Компьютерын сүлжээ', 'Магистр'],
  ['Эрдэнэ', 'Сувд', 'dep-math', 'Алгебр, тоон арга', 'Доктор (Ph.D)'],
  ['Жаргал', 'Нандин', 'dep-lang', 'Англи хэл', 'Магистр'],
  ['Болд', 'Ганхуяг', 'dep-law', 'Иргэний эрх зүй', 'Доктор (Ph.D)'],
  ['Нарантуяа', 'Энхмаа', 'dep-med', 'Хүний анатоми', 'Доктор (Ph.D)'],
  ['Мөнхбат', 'Батцэцэг', 'dep-acc', 'Санхүүгийн нягтлан бодох бүртгэл', 'Магистр'],
  ['Отгонбаяр', 'Тэмүүжин', 'dep-eco', 'Микро эдийн засаг', 'Магистр'],
  ['Ким', 'Жи Хён', 'dep-kor', 'Солонгос хэл', 'Магистр'],
  ['Сүхбаатар', 'Галбадрах', 'dep-pol', 'Эрүүгийн эрх зүй', 'Магистр'],
  ['Төмөр', 'Ган-Очир', 'dep-tech', 'Цахилгаан техник', 'Бакалавр'],
  ['Алтангэрэл', 'Сэлэнгэ', 'dep-se', 'Мобайл хөгжүүлэлт', 'Магистр'],
];
const teacherIds: Record<string, string> = {};
TEACHERS.forEach(([last, first, dep, spec, degree], i) => {
  const u = makeUser('teacher', last, first, i === 0 ? 'bat' : undefined);
  const e = makeEmployee(u, 'teacher', dep, i < 2 ? 'Ахлах багш' : 'Багш', spec, degree);
  teacherIds[`${last}.${first}`] = e.id;
  if (i === 0) DEMO_USERS.teacher = u.id;
});
const T = (key: string) => teacherIds[key];

// ---------------------------------------------------------------------------
// 5. Classes + 6. Students
// ---------------------------------------------------------------------------
const CLASSES: [string, string, string, number, number, string][] = [
  ['cls-se3a', 'prg-se', 'SE-3A', 3, 32, 'Батсүх.Бат'],
  ['cls-se3b', 'prg-se', 'SE-3B', 3, 28, 'Дамдин.Дорж'],
  ['cls-se2a', 'prg-se', 'SE-2A', 2, 26, 'Алтангэрэл.Сэлэнгэ'],
  ['cls-is2a', 'prg-is', 'IS-2A', 2, 22, 'Лхагва.Ууганбаяр'],
  ['cls-lw1a', 'prg-law', 'LW-1A', 1, 30, 'Болд.Ганхуяг'],
  ['cls-md2a', 'prg-med', 'MD-2A', 2, 24, 'Нарантуяа.Энхмаа'],
  ['cls-ac3a', 'prg-acc', 'AC-3A', 3, 20, 'Мөнхбат.Батцэцэг'],
  ['cls-ec1a', 'prg-eco', 'EC-1A', 1, 22, 'Отгонбаяр.Тэмүүжин'],
  ['cls-kr2a', 'prg-kor', 'KR-2A', 2, 18, 'Ким.Жи Хён'],
  ['cls-pl1a', 'prg-pol', 'PL-1A', 1, 26, 'Сүхбаатар.Галбадрах'],
  ['cls-mt2a', 'prg-math', 'MT-2A', 2, 16, 'Эрдэнэ.Сувд'],
  ['cls-en3a', 'prg-eng', 'EN-3A', 3, 18, 'Жаргал.Нандин'],
  ['cls-et1a', 'prg-elec', 'ET-1A', 1, 20, 'Төмөр.Ган-Очир'],
];

let stuSeq = 0;
CLASSES.forEach(([id, program_id, code, year, size, advisor]) => {
  db.classes.push({ id, program_id, advisor_id: T(advisor), name: `${code} анги`, code, year_level: year });
  const enrollYear = 2026 - year + 1;
  for (let i = 0; i < size; i++) {
    stuSeq++;
    const isDemo = id === 'cls-se3a' && i === 0;
    const u = isDemo
      ? makeUser('student', 'Батболд', 'Бат-Эрдэнэ', 'ST23SE001')
      : makeUser('student', pick(LAST_NAMES), pick(MALE), undefined);
    if (isDemo) DEMO_USERS.student = u.id;
    const r = rand();
    db.students.push({
      id: `stu-${pad(stuSeq, 4)}`,
      user_id: u.id,
      student_code: `ST${String(enrollYear).slice(2)}${db.programs.find((p) => p.id === program_id)!.code}${pad(i + 1)}`,
      register_number: `УБ${pad(Math.floor(between(0, 99)), 2)}${pad(Math.floor(between(0, 999999)), 6)}`,
      class_id: id,
      program_id,
      enrollment_year: enrollYear,
      gpa: null,
      earned_credits: 0,
      status: isDemo ? 'active' : r > 0.97 ? 'leave' : 'active',
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Subjects
// ---------------------------------------------------------------------------
const SUBJECTS: [string, string, number, string, string | null, Subject['subject_type']][] = [
  ['CS101', 'Програмчлалын үндэс', 3, 'dep-se', 'prg-se', 'mandatory'],
  ['CS205', 'Алгоритм ба өгөгдлийн бүтэц', 3, 'dep-se', 'prg-se', 'mandatory'],
  ['CS201', 'Өгөгдлийн сан', 3, 'dep-se', 'prg-se', 'mandatory'],
  ['CS301', 'Веб програмчлал', 3, 'dep-se', 'prg-se', 'mandatory'],
  ['CS305', 'Програм хангамжийн инженерчлэл', 3, 'dep-se', 'prg-se', 'mandatory'],
  ['SE310', 'Мобайл програмчлал', 3, 'dep-se', 'prg-se', 'elective'],
  ['IT210', 'Компьютерын сүлжээний үндэс', 3, 'dep-it', 'prg-is', 'mandatory'],
  ['MATH201', 'Шугаман алгебр', 3, 'dep-math', null, 'mandatory'],
  ['MATH210', 'Магадлал, статистик', 3, 'dep-math', null, 'mandatory'],
  ['ENG201', 'Академик англи хэл', 2, 'dep-lang', null, 'mandatory'],
  ['LAW101', 'Төр, эрх зүйн онол', 3, 'dep-law', 'prg-law', 'mandatory'],
  ['MED201', 'Хүний анатоми', 4, 'dep-med', 'prg-med', 'mandatory'],
  ['ACC301', 'Санхүүгийн нягтлан бодох бүртгэл II', 3, 'dep-acc', 'prg-acc', 'mandatory'],
  ['ECO101', 'Микро эдийн засаг', 3, 'dep-eco', 'prg-eco', 'mandatory'],
  ['KOR201', 'Солонгос хэл II', 3, 'dep-kor', 'prg-kor', 'mandatory'],
  ['PL101', 'Эрүүгийн эрх зүйн ерөнхий анги', 3, 'dep-pol', 'prg-pol', 'mandatory'],
  ['ET101', 'Цахилгааны үндэс', 3, 'dep-tech', 'prg-elec', 'mandatory'],
];
const subjectId: Record<string, string> = {};
SUBJECTS.forEach(([code, name, credit, department_id, program_id, subject_type]) => {
  const id = `sub-${code.toLowerCase()}`;
  subjectId[code] = id;
  db.subjects.push({ id, code, name, credit, department_id, program_id, subject_type, description: null, is_active: true });
});

// ---------------------------------------------------------------------------
// 8. Courses, grade items, enrollments, schedules
// ---------------------------------------------------------------------------
type CourseSeed = { subject: string; cls: string; teacher: string; sem: string; mode: 'draft' | 'submitted' | 'approved' };
const COURSE_SEEDS: CourseSeed[] = [
  // Өмнөх улирал — баталгаажсан
  { subject: 'CS205', cls: 'cls-se3a', teacher: 'Дамдин.Дорж', sem: PREV_SEMESTER_ID, mode: 'approved' },
  { subject: 'CS101', cls: 'cls-se3a', teacher: 'Батсүх.Бат', sem: PREV_SEMESTER_ID, mode: 'approved' },
  { subject: 'MATH210', cls: 'cls-se3a', teacher: 'Эрдэнэ.Сувд', sem: PREV_SEMESTER_ID, mode: 'approved' },
  { subject: 'CS205', cls: 'cls-se3b', teacher: 'Дамдин.Дорж', sem: PREV_SEMESTER_ID, mode: 'approved' },
  { subject: 'CS101', cls: 'cls-se3b', teacher: 'Батсүх.Бат', sem: PREV_SEMESTER_ID, mode: 'approved' },
  // Одоогийн улирал
  { subject: 'CS301', cls: 'cls-se3a', teacher: 'Батсүх.Бат', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'SE310', cls: 'cls-se3a', teacher: 'Батсүх.Бат', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'CS201', cls: 'cls-se3b', teacher: 'Батсүх.Бат', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'CS201', cls: 'cls-se3a', teacher: 'Дамдин.Дорж', sem: CURRENT_SEMESTER_ID, mode: 'submitted' },
  { subject: 'MATH201', cls: 'cls-se3a', teacher: 'Эрдэнэ.Сувд', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'CS305', cls: 'cls-se3b', teacher: 'Дамдин.Дорж', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'ENG201', cls: 'cls-se3b', teacher: 'Жаргал.Нандин', sem: CURRENT_SEMESTER_ID, mode: 'submitted' },
  { subject: 'CS101', cls: 'cls-se2a', teacher: 'Алтангэрэл.Сэлэнгэ', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'IT210', cls: 'cls-is2a', teacher: 'Лхагва.Ууганбаяр', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'LAW101', cls: 'cls-lw1a', teacher: 'Болд.Ганхуяг', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'MED201', cls: 'cls-md2a', teacher: 'Нарантуяа.Энхмаа', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'ACC301', cls: 'cls-ac3a', teacher: 'Мөнхбат.Батцэцэг', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'ECO101', cls: 'cls-ec1a', teacher: 'Отгонбаяр.Тэмүүжин', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'KOR201', cls: 'cls-kr2a', teacher: 'Ким.Жи Хён', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'PL101', cls: 'cls-pl1a', teacher: 'Сүхбаатар.Галбадрах', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'MATH201', cls: 'cls-mt2a', teacher: 'Эрдэнэ.Сувд', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'ENG201', cls: 'cls-en3a', teacher: 'Жаргал.Нандин', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
  { subject: 'ET101', cls: 'cls-et1a', teacher: 'Төмөр.Ган-Очир', sem: CURRENT_SEMESTER_ID, mode: 'draft' },
];

const GRADE_TEMPLATE: [string, number][] = [
  ['Ирц', 10],
  ['Явцын шалгалт', 20],
  ['Бие даалт', 10],
  ['Дунд шалгалт', 20],
  ['Эцсийн шалгалт', 40],
];

const SLOTS: [string, string][] = [
  ['08:00', '09:20'], ['09:40', '11:00'], ['11:20', '12:40'], ['13:30', '14:50'], ['15:10', '16:30'],
];
const BUILDINGS = ['I байр', 'II байр', 'III байр'];

// Анги бүрийн хуваарийн байрлал давхцахгүй байлгах тоолуур
const classSlotCursor: Record<string, number> = {};
const roomBusy = new Set<string>();

COURSE_SEEDS.forEach((cs, index) => {
  const cls = db.classes.find((c) => c.id === cs.cls)!;
  const course: Course = {
    id: `crs-${pad(index + 1)}`,
    subject_id: subjectId[cs.subject],
    semester_id: cs.sem,
    teacher_id: T(cs.teacher),
    class_id: cs.cls,
    section: cls.code,
    max_students: 40,
    status: cs.sem === CURRENT_SEMESTER_ID ? 'active' : 'completed',
  };
  db.courses.push(course);

  const items = GRADE_TEMPLATE.map(([name, max], i) => {
    const gi: GradeItem = { id: `gi-${course.id}-${i + 1}`, course_id: course.id, name, max_score: max, weight: max, sort_order: i + 1 };
    db.grade_items.push(gi);
    return gi;
  });

  const classStudents = db.students.filter((s) => s.class_id === cs.cls);
  classStudents.forEach((s) => {
    const ability = s.user_id === DEMO_USERS.student ? 0.9 : 0.55 + rand() * 0.43; // оюутны чадвар
    const scores: Record<string, number> = {};
    const fullGrade = cs.mode !== 'draft';
    items.forEach((it, i) => {
      if (fullGrade || i < 3) {
        const v = Math.min(it.max_score, Math.round(it.max_score * Math.min(1, ability + between(-0.12, 0.12)) * 2) / 2);
        scores[it.id] = Math.max(0, v);
      }
    });
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const graded = fullGrade ? scoreToGrade(total) : null;
    db.enrollments.push({
      id: `enr-${course.id}-${s.id}`,
      course_id: course.id,
      student_id: s.id,
      status: cs.mode === 'approved' ? 'completed' : 'enrolled',
      scores,
      total_score: fullGrade ? total : null,
      letter_grade: graded?.letter ?? null,
      gpa_point: graded?.point ?? null,
      grade_status: cs.mode,
      submitted_at: fullGrade ? '2026-09-14T10:00:00Z' : null,
      approved_at: cs.mode === 'approved' ? '2026-06-10T10:00:00Z' : null,
    });
  });

  if (cs.sem !== CURRENT_SEMESTER_ID) return;

  // Долоо хоногт 2 удаа
  for (let k = 0; k < 2; k++) {
    let placed = false;
    let cursor = classSlotCursor[cs.cls] ?? Math.floor(rand() * 5);
    while (!placed) {
      const day = (cursor % 5) + 1;
      const slot = (cursor * 3 + k) % SLOTS.length;
      const building = BUILDINGS[index % BUILDINGS.length];
      const room = String(100 * ((index % 4) + 1) + ((index * 7 + k) % 12) + 1);
      const key = `${building}|${room}|${day}|${slot}`;
      const classKey = `${cs.cls}|${day}|${slot}`;
      if (!roomBusy.has(key) && !roomBusy.has(classKey)) {
        roomBusy.add(key);
        roomBusy.add(classKey);
        db.schedules.push({
          id: `sch-${course.id}-${k}`,
          course_id: course.id,
          room,
          building,
          day_of_week: day,
          start_time: `${SLOTS[slot][0]}:00`,
          end_time: `${SLOTS[slot][1]}:00`,
        });
        placed = true;
      }
      cursor += 2;
    }
    classSlotCursor[cs.cls] = cursor;
  }
});

// ---------------------------------------------------------------------------
// 9. Attendance — 9/1 - 9/15
// ---------------------------------------------------------------------------
const attStart = new Date('2026-09-01T00:00:00');
const attEnd = new Date('2026-09-15T00:00:00');
function randomStatus(): AttendanceStatus {
  const r = rand();
  if (r < 0.84) return 'present';
  if (r < 0.9) return 'late';
  if (r < 0.95) return 'absent';
  if (r < 0.98) return 'sick';
  return 'excused';
}
db.courses
  .filter((c) => c.semester_id === CURRENT_SEMESTER_ID)
  .forEach((course) => {
    const days = db.schedules.filter((s) => s.course_id === course.id).map((s) => s.day_of_week);
    const students = db.enrollments.filter((e) => e.course_id === course.id);
    for (let d = new Date(attStart); d <= attEnd; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      if (!days.includes(dow)) continue;
      const date = toISODate(d);
      students.forEach((en) => {
        db.attendance.push({
          id: `att-${course.id}-${en.student_id}-${date}`,
          course_id: course.id,
          student_id: en.student_id,
          attendance_date: date,
          status: randomStatus(),
          note: null,
        });
      });
    }
  });

// ---------------------------------------------------------------------------
// 10. GPA, кредит тооцоолох
// ---------------------------------------------------------------------------
export function recomputeStudentGpa(studentId: string) {
  const rows = db.enrollments.filter((e) => e.student_id === studentId && e.grade_status === 'approved' && e.gpa_point !== null);
  let credits = 0;
  let points = 0;
  rows.forEach((e) => {
    const course = db.courses.find((c) => c.id === e.course_id)!;
    const credit = db.subjects.find((s) => s.id === course.subject_id)!.credit;
    credits += credit;
    points += credit * (e.gpa_point ?? 0);
  });
  const s = db.students.find((x) => x.id === studentId);
  if (!s) return;
  // Өмнөх жилүүдийн кредитийг курсээс хамааруулан нэмж бодит харагдуулна
  const cls = db.classes.find((c) => c.id === s.class_id);
  const priorCredits = cls ? (cls.year_level - 1) * 30 : 0;
  const priorGpa = s.gpa ?? 3;
  const totalCredits = credits + priorCredits;
  s.earned_credits = totalCredits;
  s.gpa = totalCredits ? Math.round(((points + priorGpa * priorCredits) / totalCredits) * 100) / 100 : null;
}
db.students.forEach((s) => {
  s.gpa = s.user_id === DEMO_USERS.student ? 3.52 : Math.round(between(2.4, 3.9) * 100) / 100;
  recomputeStudentGpa(s.id);
});
const demoStudent = db.students.find((s) => s.user_id === DEMO_USERS.student)!;

// ---------------------------------------------------------------------------
// 11. Invoices + payments
// ---------------------------------------------------------------------------
const TUITION: Record<string, number> = {
  'prg-se': 4_500_000, 'prg-is': 4_500_000, 'prg-law': 4_200_000, 'prg-med': 5_400_000, 'prg-acc': 4_100_000,
  'prg-eco': 4_100_000, 'prg-kor': 3_900_000, 'prg-pol': 4_000_000, 'prg-math': 3_800_000, 'prg-eng': 3_900_000, 'prg-elec': 3_200_000,
};
const DISCOUNTS = ['Ах дүүгийн хөнгөлөлт', 'Сурлагын тэтгэлэг', 'Спортын урамшуулал', 'Хөдөлмөрийн гэрээт'];
const METHODS: PaymentMethod[] = ['bank_transfer', 'qpay', 'qpay', 'card', 'cash'];
let invSeq = 0;

function addPayment(inv: Invoice, amount: number, date: string) {
  const p: Payment = {
    id: `pay-${pad(db.payments.length + 1, 5)}`,
    invoice_id: inv.id,
    student_id: inv.student_id,
    amount,
    method: pick(METHODS),
    transaction_reference: `TX${Math.floor(between(10_000_000, 99_999_999))}`,
    payment_date: date,
    description: null,
  };
  db.payments.push(p);
  return p;
}

export function syncInvoice(invoiceId: string) {
  const inv = db.invoices.find((i) => i.id === invoiceId);
  if (!inv) return;
  inv.net_amount = inv.tuition_amount - inv.discount_amount;
  inv.paid_amount = db.payments.filter((p) => p.invoice_id === invoiceId).reduce((s, p) => s + p.amount, 0);
  if (inv.status === 'cancelled') return;
  if (inv.paid_amount <= 0) inv.status = inv.due_date && inv.due_date < toISODate(new Date('2026-09-16')) ? 'overdue' : 'pending';
  else if (inv.paid_amount < inv.net_amount) inv.status = 'partial';
  else inv.status = 'paid';
}

db.students.forEach((s) => {
  const tuition = TUITION[s.program_id ?? 'prg-se'] ?? 4_000_000;
  [PREV_SEMESTER_ID, CURRENT_SEMESTER_ID].forEach((semId) => {
    invSeq++;
    const hasDiscount = s.id === demoStudent.id || rand() < 0.18;
    const discount = hasDiscount ? pick([300_000, 500_000, 500_000, 1_000_000]) : 0;
    const inv: Invoice = {
      id: `inv-${pad(invSeq, 5)}`,
      student_id: s.id,
      semester_id: semId,
      invoice_number: `INV-${semId === CURRENT_SEMESTER_ID ? '2026' : '2026H'}-${pad(invSeq, 5)}`,
      tuition_amount: tuition,
      discount_amount: discount,
      discount_note: hasDiscount ? (s.id === demoStudent.id ? 'Сурлагын тэтгэлэг' : pick(DISCOUNTS)) : null,
      net_amount: tuition - discount,
      paid_amount: 0,
      due_date: semId === CURRENT_SEMESTER_ID ? '2026-10-15' : '2026-02-20',
      status: 'pending',
      description: `${semId === CURRENT_SEMESTER_ID ? '2026-2027 оны намрын' : '2025-2026 оны хаврын'} улирлын сургалтын төлбөр`,
      created_at: semId === CURRENT_SEMESTER_ID ? '2026-08-25T09:00:00Z' : '2026-01-15T09:00:00Z',
    };
    db.invoices.push(inv);
    const net = inv.net_amount;
    if (semId === PREV_SEMESTER_ID) {
      addPayment(inv, Math.round(net / 2), '2026-01-28T10:00:00Z');
      addPayment(inv, net - Math.round(net / 2), '2026-03-10T10:00:00Z');
    } else if (s.id === demoStudent.id) {
      addPayment(inv, 1_000_000, '2026-09-01T10:12:00Z');
      addPayment(inv, 1_000_000, '2026-09-12T15:40:00Z');
    } else {
      const r = rand();
      if (r < 0.35) addPayment(inv, net, `2026-09-0${1 + Math.floor(rand() * 9)}T11:00:00Z`);
      else if (r < 0.75) addPayment(inv, Math.round((net * between(0.3, 0.7)) / 10_000) * 10_000, `2026-09-${pad(1 + Math.floor(rand() * 14), 2)}T11:00:00Z`);
    }
    syncInvoice(inv.id);
  });
});

// ---------------------------------------------------------------------------
// 12. Notifications
// ---------------------------------------------------------------------------
function notify(n: Partial<Notification> & Pick<Notification, 'title' | 'message'>) {
  db.notifications.push({
    id: `ntf-${pad(db.notifications.length + 1, 4)}`,
    user_id: null,
    target_role: null,
    type: 'general',
    image_url: null,
    is_read: false,
    is_published: true,
    publish_at: null,
    expire_at: null,
    created_by_name: 'Даваа Сарангэрэл',
    created_at: '2026-09-15T09:00:00Z',
    ...n,
  });
}

notify({ title: '2026–2027 оны хичээлийн жилийн хуваарь шинэчлэгдлээ', message: 'Намрын улирлын хичээлийн хуваарь эцэслэгдэж, бүх ангийн хуваарь системд орлоо. Өөрийн хуваарийг "Хуваарь" цэснээс шалгана уу.', type: 'announcement', created_at: '2026-09-15T08:30:00Z' });
notify({ title: 'Намрын улирлын явцын шалгалтын долоо хоног', message: '10 дугаар сарын 19-23-ны хооронд явцын шалгалт зохион байгуулагдана. Энэ долоо хоногт хичээлийн хуваарь өөрчлөгдөхгүй.', type: 'announcement', created_at: '2026-09-10T09:00:00Z' });
notify({ title: 'Сургалтын төлбөрийн эхний хугацаа', message: 'Намрын улирлын төлбөрийг 10 дугаар сарын 15-ны дотор төлнө үү. QPay болон банкны шилжүүлгээр төлөх боломжтой.', type: 'finance', target_role: 'student', created_by_name: 'Пүрэв Энхтуяа', created_at: '2026-09-02T09:00:00Z' });
notify({ title: 'Дүн оруулах хугацаа', message: 'Явцын дүнг 10 дугаар сарын 30-ны дотор системд оруулж, сургалтын албанд илгээнэ үү.', type: 'grade', target_role: 'teacher', created_at: '2026-09-08T09:00:00Z' });
notify({ user_id: DEMO_USERS.student, title: 'Хаврын улирлын дүн баталгаажлаа', message: 'Алгоритм ба өгөгдлийн бүтэц хичээлийн дүн баталгаажиж, таны голч дүн шинэчлэгдлээ.', type: 'grade', created_at: '2026-09-14T16:20:00Z' });
notify({ user_id: DEMO_USERS.student, title: 'Хуваарь өөрчлөгдлөө', message: 'Веб програмчлал хичээлийн Пүрэв гарагийн цаг өөр өрөөнд орохоор боллоо.', type: 'schedule', created_at: '2026-09-13T11:00:00Z' });
notify({ user_id: DEMO_USERS.student, title: 'Төлбөр хүлээн авлаа', message: '1,000,000₮ төлбөр амжилттай бүртгэгдлээ.', type: 'finance', is_read: true, created_at: '2026-09-12T15:41:00Z' });
notify({ user_id: DEMO_USERS.teacher, title: 'Шинэ хичээл оноогдлоо', message: 'Өгөгдлийн сан хичээлийг SE-3B ангид заахаар оноолоо.', type: 'schedule', created_at: '2026-08-28T10:00:00Z' });
notify({ user_id: DEMO_USERS.academic, title: 'Хянах дүн ирлээ', message: 'Д.Дорж багш Өгөгдлийн сан (SE-3A) хичээлийн дүнг илгээлээ.', type: 'grade', created_at: '2026-09-14T10:00:00Z' });

// ---------------------------------------------------------------------------
// 13. Audit logs
// ---------------------------------------------------------------------------
const AUDIT: [string, string, string, string][] = [
  [acad.id, 'CREATE_COURSE', 'courses', '2026-08-20T09:12:00Z'],
  [acad.id, 'ASSIGN_TEACHER', 'courses', '2026-08-20T09:20:00Z'],
  [acad.id, 'CREATE_SCHEDULE', 'schedules', '2026-08-22T14:03:00Z'],
  [fin.id, 'CREATE_INVOICE', 'invoices', '2026-08-25T09:00:00Z'],
  [admin.id, 'UPDATE_ROLE', 'users', '2026-08-26T11:40:00Z'],
  [acad.id, 'CREATE_STUDENT', 'students', '2026-08-29T10:15:00Z'],
  [fin.id, 'RECORD_PAYMENT', 'payments', '2026-09-01T10:12:00Z'],
  [acad.id, 'UPDATE_SCHEDULE', 'schedules', '2026-09-13T11:00:00Z'],
  [DEMO_USERS.teacher, 'UPDATE_ATTENDANCE', 'attendance', '2026-09-14T09:25:00Z'],
  [teacherIdsToUser('Дамдин.Дорж'), 'SUBMIT_GRADE', 'enrollments', '2026-09-14T10:00:00Z'],
  [fin.id, 'RECORD_PAYMENT', 'payments', '2026-09-12T15:40:00Z'],
  [acad.id, 'APPROVE_GRADE', 'enrollments', '2026-09-14T16:20:00Z'],
  [admin.id, 'CREATE_USER', 'users', '2026-09-15T08:05:00Z'],
];
function teacherIdsToUser(key: string) {
  return db.employees.find((e) => e.id === T(key))!.user_id;
}
AUDIT.forEach(([user_id, action, table_name, created_at], i) =>
  db.audit_logs.push({
    id: `aud-${pad(i + 1, 4)}`,
    user_id,
    action,
    table_name,
    record_id: null,
    old_data: null,
    new_data: null,
    ip_address: `10.20.${Math.floor(between(1, 20))}.${Math.floor(between(2, 250))}`,
    created_at,
  }),
);

// ---------------------------------------------------------------------------
// 14. Хичээлийн материал (жишээ өгөгдөл)
// ---------------------------------------------------------------------------
const MATERIAL_SEEDS: [string, string, string, string, string, number][] = [
  ['Лекц 1: Веб хөгжүүлэлтийн танилцуулга', 'Хичээлийн агуулга, үнэлгээний журам.', 'lecture-01-intro.pdf', 'application/pdf', 'CS301', 1_842_000],
  ['Лекц 2: HTML, CSS сэргээлт', 'Дасгалын файл хавсаргав.', 'lecture-02-html-css.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'CS301', 4_210_000],
  ['Бие даалтын удирдамж', '10 дугаар сарын 20-ны дотор илгээнэ.', 'biedaalt-udirdamj.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'CS301', 96_000],
  ['Лаборатори 3: SQL асуулга', null as unknown as string, 'lab-03-sql.pdf', 'application/pdf', 'CS201', 720_000],
];

MATERIAL_SEEDS.forEach(([title, description, file_name, mime_type, subjectCode, size], i) => {
  const course = db.courses.find((c) => c.semester_id === CURRENT_SEMESTER_ID && c.subject_id === subjectId[subjectCode]);
  if (!course) return;
  const teacher = db.employees.find((e) => e.id === course.teacher_id);
  db.course_materials.push({
    id: `mat-${pad(i + 1)}`,
    course_id: course.id,
    uploaded_by: teacher?.user_id ?? null,
    title,
    description: description ?? null,
    file_path: `${course.id}/seed-${i + 1}-${file_name}`,
    file_name,
    mime_type,
    size_bytes: size,
    is_published: true,
    created_at: `2026-09-${pad(2 + i * 3, 2)}T09:00:00Z`,
  });
});

// Материалын хандалт (жишээ): оюутнуудын 40-80% нь татсан байхаар
db.course_materials.forEach((m, mi) => {
  const students = db.enrollments.filter((e) => e.course_id === m.course_id).map((e) => e.student_id);
  const share = 0.4 + rand() * 0.4;
  students.forEach((student_id, si) => {
    if ((si * 7 + mi * 3) % 10 >= share * 10) return;
    const count = rand() < 0.25 ? 2 : 1;
    db.material_access.push({
      id: `mac-${mi}-${si}`,
      material_id: m.id,
      student_id,
      download_count: count,
      first_at: `2026-09-${pad(6 + (si % 8), 2)}T10:${pad((si * 7) % 60, 2)}:00Z`,
      last_at: `2026-09-${pad(10 + (si % 5), 2)}T14:${pad((si * 11) % 60, 2)}:00Z`,
    });
  });
});

// ---------------------------------------------------------------------------
// 15. Өрөөнүүд (хуваариас автоматаар + нэмэлт том танхимууд)
// ---------------------------------------------------------------------------
const seenRooms = new Set<string>();
db.schedules.forEach((s) => {
  const key = `${s.building ?? ''}|${s.room ?? ''}`;
  if (!s.room || seenRooms.has(key)) return;
  seenRooms.add(key);
  db.rooms.push({ id: `room-${db.rooms.length + 1}`, building: s.building ?? 'I байр', code: s.room, capacity: 40, room_type: 'lecture', note: null, is_active: true });
});
// Нэгдсэн лекцэд тохирох том танхимууд
[['I байр', '101', 120], ['I байр', '102', 90], ['II байр', '201', 150], ['III байр', '301', 60]].forEach(([building, code, capacity], i) => {
  if (seenRooms.has(`${building}|${code}`)) return;
  db.rooms.push({ id: `room-big-${i + 1}`, building: building as string, code: code as string, capacity: capacity as number, room_type: 'lecture', note: 'Том лекцийн танхим', is_active: true });
});
