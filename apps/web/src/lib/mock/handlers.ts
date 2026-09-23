/**
 * Express API-ийн endpoint-уудыг дуурайлгасан mock handler-ууд.
 * Бодит backend-д яг ийм URL, хариуны бүтэц (`{ data }`) хэрэгжүүлнэ.
 * RLS-ийн дүрмийг (оюутан зөвхөн өөрийн, багш зөвхөн өөрийн хичээл) энд мөн дагав.
 */
import type {
  AppUser, Attendance, AttendanceStatus, ClassGroup, Course, Department, EmployeeView, Enrollment,
  CourseMaterial, Invoice, Notification, Payment, Program, Schedule, ScheduleRecord, Semester, Session, StudentView, Subject, UserRole,
} from '@/types/models';
import type {
  CourseStats, DepartmentReport, FinanceReport, OverviewReport, SchoolReport, StudentSummary,
} from '@/types/reports';
import { computeTotal, letterBucket, scoreToGrade, weightedGpa } from '../gpa';
import { CURRENT_SEMESTER_ID, DEMO_USERS, db, newId, recomputeStudentGpa, syncInvoice } from './db';
import { TIME_SLOTS, WEEK_DAYS, conflictMessage, findAllConflicts, findConflicts, overlaps, toMin } from '@/features/schedules/lib/timetable';

export class MockHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Ctx = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: any;
  session: Session;
};
type Handler = (ctx: Ctx) => unknown;

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
export const MOCK_SESSION_KEY = 'ikhzasag.mock.role';

export function getMockSession(): Session | null {
  const role = sessionStorage.getItem(MOCK_SESSION_KEY) as UserRole | null;
  if (!role) return null;
  return buildSession(DEMO_USERS[role]);
}

function buildSession(userId: string): Session {
  const user = db.users.find((u) => u.id === userId)!;
  const student = db.students.find((s) => s.user_id === userId);
  const employee = db.employees.find((e) => e.user_id === userId);
  return {
    user,
    student: student ? studentView(student.id) : null,
    employee: employee ? employeeView(employee.id) : null,
  };
}

// ---------------------------------------------------------------------------
// Views / joins
// ---------------------------------------------------------------------------
const byId = <T extends { id: string }>(arr: T[], id: string | null | undefined) => (id ? arr.find((x) => x.id === id) : undefined);

function studentView(id: string): StudentView {
  const s = byId(db.students, id)!;
  const u = byId(db.users, s.user_id)!;
  const c = byId(db.classes, s.class_id);
  const p = byId(db.programs, s.program_id);
  const d = byId(db.departments, p?.department_id);
  return {
    ...s,
    last_name: u.last_name,
    first_name: u.first_name,
    full_name: u.full_name,
    email: u.email,
    phone: u.phone,
    class_name: c?.code ?? null,
    program_name: p?.name ?? null,
    department_name: d?.name ?? null,
  };
}

function employeeView(id: string): EmployeeView {
  const e = byId(db.employees, id)!;
  const u = byId(db.users, e.user_id)!;
  return {
    ...e,
    last_name: u.last_name,
    first_name: u.first_name,
    full_name: u.full_name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    department_name: byId(db.departments, e.department_id)?.name ?? null,
  };
}

function employeeName(id: string | null) {
  const e = byId(db.employees, id);
  return e ? byId(db.users, e.user_id)?.full_name ?? null : null;
}

function courseView(c: Course): Course {
  const sub = byId(db.subjects, c.subject_id)!;
  const sem = byId(db.semesters, c.semester_id)!;
  return {
    ...c,
    subject_code: sub.code,
    subject_name: sub.name,
    credit: sub.credit,
    teacher_name: employeeName(c.teacher_id),
    class_name: byId(db.classes, c.class_id)?.code ?? null,
    semester_name: `${sem.academic_year} ${sem.name}`,
    student_count: db.enrollments.filter((e) => e.course_id === c.id && e.status !== 'dropped').length,
  };
}

function enrollmentView(e: Enrollment): Enrollment {
  const course = courseView(byId(db.courses, e.course_id)!);
  const s = studentView(e.student_id);
  return {
    ...e,
    student_code: s.student_code,
    student_name: s.full_name,
    subject_name: course.subject_name,
    subject_code: course.subject_code,
    credit: course.credit,
    teacher_name: course.teacher_name,
    class_name: course.class_name,
    semester_name: course.semester_name,
  };
}

function scheduleView(s: ScheduleRecord): Schedule {
  const raw = byId(db.courses, s.course_id)!;
  const c = courseView(raw);
  return {
    ...s,
    session_type: s.session_type ?? 'lecture',
    is_online: !!s.is_online,
    student_count: db.enrollments.filter((e) => e.course_id === s.course_id && e.status !== 'dropped').length,
    semester_id: raw.semester_id,
    class_id: raw.class_id,
    teacher_id: raw.teacher_id,
    subject_code: c.subject_code,
    subject_name: c.subject_name,
    teacher_name: c.teacher_name,
    class_name: c.class_name,
  };
}

function semesterSchedules(semesterId: string) {
  const ids = new Set(db.courses.filter((c) => c.semester_id === semesterId).map((c) => c.id));
  return db.schedules.filter((s) => ids.has(s.course_id)).map(scheduleView);
}

/** Анги, багш, өрөөний давхцлыг шалгана (DB trigger-тэй ижил дүрэм) */
function assertScheduleFree(candidate: ScheduleRecord) {
  const course = byId(db.courses, candidate.course_id);
  if (!course) throw new MockHttpError(404, 'Хичээл олдсонгүй.');
  if (toMin(candidate.end_time) <= toMin(candidate.start_time)) throw new MockHttpError(422, 'Дуусах цаг эхлэх цагаас хойш байх ёстой.');
  const entry = { ...candidate, class_id: course.class_id, teacher_id: course.teacher_id };
  const others = semesterSchedules(course.semester_id).filter((s) => s.id !== candidate.id);
  const [first] = findConflicts(entry, others);
  if (first) throw new MockHttpError(409, conflictMessage(first.kind, first.with));
}

/** Өрөөний багтаамжийн анхааруулга (хориглохгүй) */
function capacityWarnings(rows: ScheduleRecord[]): string[] {
  const first = rows[0];
  if (!first || first.is_online || !first.room) return [];
  const room = db.rooms.find((r) => r.code === first.room && r.building === (first.building ?? r.building));
  if (!room) return [`${first.building ?? ''} ${first.room} өрөө бүртгэлд алга.`];
  const seats = rows.reduce((sum, r) => sum + db.enrollments.filter((e) => e.course_id === r.course_id && e.status !== 'dropped').length, 0);
  return seats > room.capacity ? [`Оюутны тоо (${seats}) өрөөний багтаамжаас (${room.capacity}) хэтэрсэн байна.`] : [];
}

function invoiceView(i: Invoice): Invoice {
  const s = studentView(i.student_id);
  const sem = byId(db.semesters, i.semester_id);
  return { ...i, student_code: s.student_code, student_name: s.full_name, semester_name: sem ? `${sem.academic_year} ${sem.name}` : undefined };
}

function paymentView(p: Payment): Payment {
  const inv = byId(db.invoices, p.invoice_id)!;
  const s = studentView(p.student_id);
  return { ...p, invoice_number: inv.invoice_number, student_name: s.full_name, student_code: s.student_code };
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------
const STAFF: UserRole[] = ['super_admin', 'management', 'academic', 'finance'];
function allow(ctx: Ctx, ...roles: UserRole[]) {
  if (!roles.includes(ctx.session.user.role)) throw new MockHttpError(403, 'Энэ үйлдлийг хийх эрх танд байхгүй байна.');
}
function assertTeaches(ctx: Ctx, courseId: string) {
  const role = ctx.session.user.role;
  if (role === 'super_admin' || role === 'academic') return;
  if (role === 'management') return;
  const course = byId(db.courses, courseId);
  if (!course) throw new MockHttpError(404, 'Хичээл олдсонгүй.');
  if (role !== 'teacher' || course.teacher_id !== ctx.session.employee?.id) {
    throw new MockHttpError(403, 'Та зөвхөн өөрт оноогдсон хичээлд хандах боломжтой.');
  }
}
function audit(ctx: Ctx, action: string, table_name: string, record_id: string | null = null, new_data: unknown = null) {
  db.audit_logs.unshift({
    id: newId('aud'),
    user_id: ctx.session.user.id,
    action,
    table_name,
    record_id,
    old_data: null,
    new_data: (new_data as Record<string, unknown>) ?? null,
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString(),
  });
}
function required(body: Record<string, unknown>, ...keys: string[]) {
  const missing = keys.filter((k) => body[k] === undefined || body[k] === null || body[k] === '');
  if (missing.length) throw new MockHttpError(422, `Дараах талбарыг бөглөнө үү: ${missing.join(', ')}`);
}
const now = () => new Date().toISOString();
const matches = (value: string | null | undefined, q?: string) => !q || (value ?? '').toLowerCase().includes(q.toLowerCase());

function schoolOf(departmentId: string | null | undefined): Department | undefined {
  let d = byId(db.departments, departmentId);
  while (d && d.level !== 'school') d = byId(db.departments, d.parent_id);
  return d;
}
function attendanceRate(rows: Attendance[]) {
  if (!rows.length) return 0;
  const ok = rows.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
  return Math.round((ok / rows.length) * 1000) / 10;
}
const avg = (nums: number[]) => (nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : 0);


const mustChangePassword = new Map<string, boolean>();

function userDetail(id: string) {
  const u = byId(db.users, id);
  if (!u) throw new MockHttpError(404, 'Хэрэглэгч олдсонгүй.');
  const st = db.students.find((x) => x.user_id === id);
  const em = db.employees.find((x) => x.user_id === id);
  return {
    user: u,
    student: st ? studentView(st.id) : null,
    employee: em ? employeeView(em.id) : null,
    auth: { last_sign_in_at: '2026-09-15T08:12:00Z', email_confirmed_at: u.created_at, must_change_password: mustChangePassword.get(id) ?? false, banned_until: null },
  };
}

/** Туршилтын горимд анхны нууц үг үүсгэнэ (API-тай ижил хариу) */
const mockPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '7';
};

// ----- Хичээлийн материал -----
function materialView(m: CourseMaterial): CourseMaterial {
  const course = byId(db.courses, m.course_id);
  const sub = byId(db.subjects, course?.subject_id);
  return {
    ...m,
    uploaded_by_name: byId(db.users, m.uploaded_by)?.full_name ?? null,
    subject_code: sub?.code,
    subject_name: sub?.name,
    class_name: byId(db.classes, course?.class_id)?.code ?? null,
  };
}

/** Материал харах эрх: багш өөрийн хичээл, оюутан бүртгэлтэй хичээл, алба бүгд */
function assertCourseView(ctx: Ctx, courseId: string) {
  const role = ctx.session.user.role;
  if (['super_admin', 'academic', 'management'].includes(role)) return;
  const course = byId(db.courses, courseId);
  if (!course) throw new MockHttpError(404, 'Хичээл олдсонгүй.');
  if (role === 'teacher') {
    if (course.teacher_id !== ctx.session.employee?.id) throw new MockHttpError(403, 'Та зөвхөн өөрийн хичээлд хандах боломжтой.');
    return;
  }
  if (role === 'student') {
    const enrolled = db.enrollments.some((e) => e.course_id === courseId && e.student_id === ctx.session.student?.id && e.status !== 'dropped');
    if (!enrolled) throw new MockHttpError(403, 'Та энэ хичээлд бүртгэлгүй байна.');
    return;
  }
  throw new MockHttpError(403, 'Хандах эрх алга.');
}

function materialForWrite(ctx: Ctx, id: string) {
  const m = byId(db.course_materials, id);
  if (!m) throw new MockHttpError(404, 'Материал олдсонгүй.');
  const course = byId(db.courses, m.course_id)!;
  const isStaff = ['super_admin', 'academic'].includes(ctx.session.user.role);
  const isTeacher = ctx.session.user.role === 'teacher' && course.teacher_id === ctx.session.employee?.id;
  if (!isStaff && !isTeacher) throw new MockHttpError(403, 'Зөвхөн хичээлийн багш материалаа удирдана.');
  return m;
}

/** Материалын түр холбоос: mode='inline' үед вэб дээр шууд нээгдэнэ */
function materialLink(ctx: Ctx, mode: 'download' | 'inline') {
  const m = byId(db.course_materials, ctx.params.id);
  if (!m) throw new MockHttpError(404, 'Материал олдсонгүй.');
  assertCourseView(ctx, m.course_id);

  // Оюутны хандалтыг бүртгэнэ (үзсэн ч, татсан ч тооцно)
  if (ctx.session.user.role === 'student' && ctx.session.student) {
    const existing = db.material_access.find((a) => a.material_id === m.id && a.student_id === ctx.session.student!.id);
    if (existing) {
      existing.download_count++;
      existing.last_at = now();
    } else {
      db.material_access.push({ id: newId('mac'), material_id: m.id, student_id: ctx.session.student.id, download_count: 1, first_at: now(), last_at: now() });
    }
  }

  // Туршилтын горимд бодит файл байхгүй тул жишиг текст үзүүлнэ
  const text = `${m.title}\n${m.description ?? ''}\n\nТуршилтын горимын жишээ агуулга. Supabase холбогдсон үед жинхэнэ файл нээгдэнэ.`;
  return {
    url: `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`,
    file_name: mode === 'download' ? `${m.file_name.replace(/\.[^.]+$/, '')}.txt` : m.file_name,
    mime_type: 'text/plain',
    can_preview: true,
    expires_in: 300,
  };
}

function certificateView(c: any) {
  return { ...c, is_valid: !c.revoked_at && (!c.valid_until || c.valid_until >= new Date().toISOString().slice(0, 10)) };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export const routes: Record<string, Handler> = {
  // ----- AUTH -----
  'GET /auth/me': ({ session }) => session,

  // ----- USERS -----
  'GET /users': (ctx) => {
    allow(ctx, 'super_admin', 'management', 'academic');
    const { q, role, status } = ctx.query;
    return db.users
      .filter((u) => (!role || u.role === role) && (!status || u.status === status))
      .filter((u) => matches(u.full_name, q) || matches(u.email, q))
      .slice(0, 200);
  },
  'POST /users': (ctx) => {
    allow(ctx, 'super_admin');
    required(ctx.body, 'last_name', 'first_name', 'email', 'role');
    if (db.users.some((u) => u.email === ctx.body.email)) throw new MockHttpError(409, 'Энэ и-мэйл бүртгэлтэй байна.');
    const u: AppUser = {
      id: newId('usr'),
      role: ctx.body.role,
      email: ctx.body.email,
      last_name: ctx.body.last_name,
      first_name: ctx.body.first_name,
      full_name: `${ctx.body.last_name} ${ctx.body.first_name}`,
      phone: ctx.body.phone || null,
      avatar_url: null,
      status: 'active',
      created_at: now(),
    };
    db.users.unshift(u);
    audit(ctx, 'CREATE_USER', 'users', u.id);
    return { ...u, initial_password: ctx.body.password ? null : mockPassword() };
  },
  'GET /users/:id': (ctx) => {
    allow(ctx, 'super_admin');
    return userDetail(ctx.params.id);
  },
  'PATCH /users/:id': (ctx) => {
    allow(ctx, 'super_admin');
    const u = byId(db.users, ctx.params.id);
    if (!u) throw new MockHttpError(404, 'Хэрэглэгч олдсонгүй.');
    const { student, employee, ...base } = ctx.body as Record<string, any>;
    const isSelf = u.id === ctx.session.user.id;
    if (isSelf && ((base.role && base.role !== u.role) || (base.status && base.status !== u.status))) {
      throw new MockHttpError(403, 'Өөрийн эрх, төлөвийг өөрчлөх боломжгүй.');
    }
    const losingAdmin = u.role === 'super_admin' && u.status === 'active' && ((base.role && base.role !== 'super_admin') || (base.status && base.status !== 'active'));
    if (losingAdmin && db.users.filter((x) => x.role === 'super_admin' && x.status === 'active').length <= 1) {
      throw new MockHttpError(403, 'Системд дор хаяж нэг идэвхтэй системийн админ байх шаардлагатай.');
    }
    if (base.email && base.email !== u.email && db.users.some((x) => x.id !== u.id && x.email === base.email)) {
      throw new MockHttpError(409, 'Энэ и-мэйл хаяг өөр хэрэглэгчид бүртгэлтэй байна.');
    }
    const changed: string[] = [];
    (['last_name', 'first_name', 'email', 'phone', 'role', 'status'] as const).forEach((k) => {
      if (base[k] !== undefined) {
        (u as any)[k] = base[k] === '' && k === 'phone' ? null : base[k];
        changed.push(k);
      }
    });
    u.full_name = `${u.last_name} ${u.first_name}`;

    if (student && Object.keys(student).length) {
      const st = db.students.find((x) => x.user_id === u.id);
      if (!st) throw new MockHttpError(422, 'Энэ хэрэглэгч оюутны профайлгүй байна.');
      if (student.student_code && db.students.some((x) => x.id !== st.id && x.student_code === String(student.student_code).toUpperCase())) {
        throw new MockHttpError(409, 'Оюутны код өөр оюутанд бүртгэлтэй байна.');
      }
      if (student.student_code) student.student_code = String(student.student_code).toUpperCase();
      if (student.class_id) student.program_id = byId(db.classes, student.class_id)?.program_id ?? st.program_id;
      Object.assign(st, student);
      changed.push(...Object.keys(student).map((k) => `student.${k}`));
    }
    if (employee && Object.keys(employee).length) {
      const em = db.employees.find((x) => x.user_id === u.id);
      if (!em) throw new MockHttpError(422, 'Энэ хэрэглэгч ажилтны профайлгүй байна.');
      if (employee.employee_code && db.employees.some((x) => x.id !== em.id && x.employee_code === String(employee.employee_code).toUpperCase())) {
        throw new MockHttpError(409, 'Ажилтны код өөр ажилтанд бүртгэлтэй байна.');
      }
      if (employee.employee_code) employee.employee_code = String(employee.employee_code).toUpperCase();
      Object.assign(em, employee);
      changed.push(...Object.keys(employee).map((k) => `employee.${k}`));
    }
    audit(ctx, changed.includes('role') ? 'UPDATE_ROLE' : 'UPDATE_USER', 'users', u.id, { changed });
    return { ...userDetail(u.id), changed };
  },
  'POST /users/:id/confirm-email': (ctx) => {
    allow(ctx, 'super_admin');
    if (!byId(db.users, ctx.params.id)) throw new MockHttpError(404, 'Хэрэглэгч олдсонгүй.');
    return { already_confirmed: true, email_confirmed_at: new Date().toISOString() };
  },
  'POST /users/confirm-emails': (ctx) => {
    allow(ctx, 'super_admin');
    return { confirmed: 0, failed: [] };
  },
  'POST /users/:id/password': (ctx) => {
    allow(ctx, 'super_admin');
    const u = byId(db.users, ctx.params.id);
    if (!u) throw new MockHttpError(404, 'Хэрэглэгч олдсонгүй.');
    const given = ctx.body.password ? String(ctx.body.password) : '';
    if (given && given.length < 8) throw new MockHttpError(422, 'Нууц үг хамгийн багадаа 8 тэмдэгт');
    const mustChange = ctx.body.must_change !== false;
    mustChangePassword.set(u.id, mustChange);
    audit(ctx, 'RESET_PASSWORD', 'users', u.id, { generated: !given, must_change: mustChange });
    return { password: given ? null : mockPassword(), must_change_password: mustChange };
  },

  // ----- DEPARTMENTS -----
  'GET /departments': (ctx) => {
    const { level, parent_id } = ctx.query;
    return db.departments.filter((d) => (!level || d.level === level) && (!parent_id || d.parent_id === parent_id));
  },
  'POST /departments': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'name', 'level');
    const d: Department = { id: newId('dep'), parent_id: ctx.body.parent_id || null, level: ctx.body.level, name: ctx.body.name, code: ctx.body.code || null, head_name: ctx.body.head_name || null, phone: null, email: null, is_active: true };
    db.departments.push(d);
    audit(ctx, 'CREATE_DEPARTMENT', 'departments', d.id);
    return d;
  },
  'PATCH /departments/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const d = byId(db.departments, ctx.params.id);
    if (!d) throw new MockHttpError(404, 'Олдсонгүй.');
    Object.assign(d, ctx.body);
    return d;
  },

  // ----- PROGRAMS -----
  'GET /programs': (ctx) =>
    db.programs
      .filter((p) => !ctx.query.department_id || p.department_id === ctx.query.department_id)
      .map((p) => ({ ...p, department_name: byId(db.departments, p.department_id)?.name })),
  'POST /programs': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'name', 'department_id');
    const p: Program = { id: newId('prg'), department_id: ctx.body.department_id, name: ctx.body.name, code: ctx.body.code || null, degree: ctx.body.degree || 'Бакалавр', duration_years: Number(ctx.body.duration_years) || 4, total_credits: Number(ctx.body.total_credits) || null, is_active: true };
    db.programs.push(p);
    audit(ctx, 'CREATE_PROGRAM', 'programs', p.id);
    return p;
  },
  'PATCH /programs/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const p = byId(db.programs, ctx.params.id);
    if (!p) throw new MockHttpError(404, 'Олдсонгүй.');
    Object.assign(p, ctx.body);
    return p;
  },

  // ----- SEMESTERS -----
  'GET /semesters': () => [...db.semesters].sort((a, b) => b.start_date.localeCompare(a.start_date)),
  'GET /semesters/current': () => db.semesters.find((s) => s.is_current) ?? null,
  'POST /semesters': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'academic_year', 'name', 'semester_number', 'start_date', 'end_date');
    if (ctx.body.end_date <= ctx.body.start_date) throw new MockHttpError(422, 'Дуусах огноо эхлэх огнооноос хойш байх ёстой.');
    const s: Semester = { id: newId('sem'), ...ctx.body, semester_number: Number(ctx.body.semester_number), is_current: false };
    db.semesters.push(s);
    return s;
  },
  'POST /semesters/:id/set-current': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    db.semesters.forEach((s) => (s.is_current = s.id === ctx.params.id));
    audit(ctx, 'SET_CURRENT_SEMESTER', 'semesters', ctx.params.id);
    return byId(db.semesters, ctx.params.id);
  },

  // ----- CLASSES -----
  'GET /classes': (ctx) =>
    db.classes
      .filter((c) => !ctx.query.program_id || c.program_id === ctx.query.program_id)
      .map<ClassGroup>((c) => ({
        ...c,
        program_name: byId(db.programs, c.program_id)?.name,
        advisor_name: employeeName(c.advisor_id),
        student_count: db.students.filter((s) => s.class_id === c.id).length,
      })),
  'POST /classes': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'code', 'program_id', 'year_level');
    if (db.classes.some((c) => c.code === ctx.body.code)) throw new MockHttpError(409, 'Ангийн код давхцаж байна.');
    const c: ClassGroup = { id: newId('cls'), program_id: ctx.body.program_id, advisor_id: ctx.body.advisor_id || null, name: ctx.body.name || `${ctx.body.code} анги`, code: ctx.body.code, year_level: Number(ctx.body.year_level) };
    db.classes.push(c);
    audit(ctx, 'CREATE_CLASS', 'classes', c.id);
    return c;
  },
  'PATCH /classes/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const c = byId(db.classes, ctx.params.id);
    if (!c) throw new MockHttpError(404, 'Олдсонгүй.');
    Object.assign(c, ctx.body);
    return c;
  },

  // ----- STUDENTS -----
  'GET /students': (ctx) => {
    allow(ctx, ...STAFF);
    const { q, status, class_id, program_id } = ctx.query;
    return db.students
      .filter((s) => (!status || s.status === status) && (!class_id || s.class_id === class_id) && (!program_id || s.program_id === program_id))
      .map((s) => studentView(s.id))
      .filter((s) => matches(s.full_name, q) || matches(s.student_code, q) || matches(s.register_number, q));
  },
  'GET /students/:id': (ctx) => {
    const s = byId(db.students, ctx.params.id);
    if (!s) throw new MockHttpError(404, 'Оюутан олдсонгүй.');
    if (ctx.session.user.role === 'student' && ctx.session.student?.id !== s.id) throw new MockHttpError(403, 'Хандах эрхгүй.');
    const view = studentView(s.id);
    const enrollments = db.enrollments.filter((e) => e.student_id === s.id).map(enrollmentView);
    const invoices = db.invoices.filter((i) => i.student_id === s.id).map(invoiceView);
    const attendance = db.attendance.filter((a) => a.student_id === s.id);
    return { student: view, enrollments, invoices, attendance_rate: attendanceRate(attendance) };
  },
  'POST /students': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'last_name', 'first_name', 'student_code', 'class_id');
    if (db.students.some((s) => s.student_code === ctx.body.student_code)) throw new MockHttpError(409, 'Оюутны код давхцаж байна.');
    const cls = byId(db.classes, ctx.body.class_id)!;
    const u: AppUser = { id: newId('usr'), role: 'student', email: ctx.body.email || `${String(ctx.body.student_code).toLowerCase()}@student.ikhzasag.edu.mn`, last_name: ctx.body.last_name, first_name: ctx.body.first_name, full_name: `${ctx.body.last_name} ${ctx.body.first_name}`, phone: ctx.body.phone || null, avatar_url: null, status: 'active', created_at: now() };
    db.users.push(u);
    const s = { id: newId('stu'), user_id: u.id, student_code: ctx.body.student_code, register_number: ctx.body.register_number || null, class_id: cls.id, program_id: cls.program_id, enrollment_year: Number(ctx.body.enrollment_year) || 2026, gpa: null, earned_credits: 0, status: 'active' as const };
    db.students.unshift(s);
    audit(ctx, 'CREATE_STUDENT', 'students', s.id);
    return { ...studentView(s.id), initial_password: ctx.body.password ? null : mockPassword() };
  },
  'PATCH /students/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const s = byId(db.students, ctx.params.id);
    if (!s) throw new MockHttpError(404, 'Оюутан олдсонгүй.');
    const { last_name, first_name, email, phone, ...rest } = ctx.body;
    if (rest.class_id) rest.program_id = byId(db.classes, rest.class_id)?.program_id ?? s.program_id;
    Object.assign(s, rest);
    const u = byId(db.users, s.user_id)!;
    Object.assign(u, Object.fromEntries(Object.entries({ last_name, first_name, email, phone }).filter(([, v]) => v !== undefined)));
    u.full_name = `${u.last_name} ${u.first_name}`;
    audit(ctx, rest.status ? 'UPDATE_STUDENT_STATUS' : 'UPDATE_STUDENT', 'students', s.id, ctx.body);
    return studentView(s.id);
  },

  // ----- EMPLOYEES -----
  'GET /employees': (ctx) => {
    const { type, department_id, q } = ctx.query;
    return db.employees
      .filter((e) => (!type || e.employee_type === type) && (!department_id || e.department_id === department_id))
      .map((e) => employeeView(e.id))
      .filter((e) => matches(e.full_name, q) || matches(e.employee_code, q));
  },
  'POST /employees': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'last_name', 'first_name', 'employee_code', 'employee_type');
    const roleMap: Record<string, UserRole> = { teacher: 'teacher', academic: 'academic', finance: 'finance', management: 'management', admin: 'super_admin' };
    const u: AppUser = { id: newId('usr'), role: roleMap[ctx.body.employee_type], email: ctx.body.email || null, last_name: ctx.body.last_name, first_name: ctx.body.first_name, full_name: `${ctx.body.last_name} ${ctx.body.first_name}`, phone: ctx.body.phone || null, avatar_url: null, status: 'active', created_at: now() };
    db.users.push(u);
    const e = { id: newId('emp'), user_id: u.id, employee_code: ctx.body.employee_code, employee_type: ctx.body.employee_type, department_id: ctx.body.department_id || null, position: ctx.body.position || null, specialization: ctx.body.specialization || null, academic_degree: ctx.body.academic_degree || null, hired_at: ctx.body.hired_at || null, is_active: true };
    db.employees.push(e);
    audit(ctx, 'CREATE_EMPLOYEE', 'employees', e.id);
    return { ...employeeView(e.id), initial_password: ctx.body.password ? null : mockPassword() };
  },
  'PATCH /employees/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const e = byId(db.employees, ctx.params.id);
    if (!e) throw new MockHttpError(404, 'Олдсонгүй.');
    Object.assign(e, ctx.body);
    return employeeView(e.id);
  },

  // ----- SUBJECTS -----
  'GET /subjects': (ctx) =>
    db.subjects
      .filter((s) => (!ctx.query.department_id || s.department_id === ctx.query.department_id) && (matches(s.name, ctx.query.q) || matches(s.code, ctx.query.q)))
      .map((s) => ({ ...s, department_name: byId(db.departments, s.department_id)?.name ?? null })),
  'POST /subjects': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'code', 'name', 'credit');
    if (db.subjects.some((s) => s.code === ctx.body.code)) throw new MockHttpError(409, 'Хичээлийн код давхцаж байна.');
    const s: Subject = { id: newId('sub'), code: ctx.body.code, name: ctx.body.name, credit: Number(ctx.body.credit), department_id: ctx.body.department_id || null, program_id: ctx.body.program_id || null, subject_type: ctx.body.subject_type || 'mandatory', description: ctx.body.description || null, is_active: true };
    db.subjects.push(s);
    audit(ctx, 'CREATE_SUBJECT', 'subjects', s.id);
    return s;
  },
  'PATCH /subjects/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const s = byId(db.subjects, ctx.params.id);
    if (!s) throw new MockHttpError(404, 'Олдсонгүй.');
    Object.assign(s, ctx.body, ctx.body.credit ? { credit: Number(ctx.body.credit) } : {});
    return s;
  },

  // ----- COURSES -----
  'GET /courses': (ctx) => {
    const { semester_id, class_id, teacher_id, mine } = ctx.query;
    let rows = db.courses;
    if (mine === 'true') {
      if (ctx.session.user.role === 'teacher') rows = rows.filter((c) => c.teacher_id === ctx.session.employee?.id);
      else if (ctx.session.user.role === 'student') {
        const ids = new Set(db.enrollments.filter((e) => e.student_id === ctx.session.student?.id).map((e) => e.course_id));
        rows = rows.filter((c) => ids.has(c.id));
      }
    }
    return rows
      .filter((c) => (!semester_id || c.semester_id === semester_id) && (!class_id || c.class_id === class_id) && (!teacher_id || c.teacher_id === teacher_id))
      .map(courseView);
  },
  'GET /courses/:id': (ctx) => {
    const c = byId(db.courses, ctx.params.id);
    if (!c) throw new MockHttpError(404, 'Хичээл олдсонгүй.');
    if (ctx.session.user.role === 'teacher') assertTeaches(ctx, c.id);
    return courseView(c);
  },
  'POST /courses': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'subject_id', 'semester_id', 'class_id');
    const cls = byId(db.classes, ctx.body.class_id)!;
    const section = ctx.body.section || cls.code;
    if (db.courses.some((c) => c.subject_id === ctx.body.subject_id && c.semester_id === ctx.body.semester_id && c.section === section)) {
      throw new MockHttpError(409, 'Энэ улиралд уг хичээл энэ ангид аль хэдийн хуваарилагдсан байна.');
    }
    const c: Course = { id: newId('crs'), subject_id: ctx.body.subject_id, semester_id: ctx.body.semester_id, teacher_id: ctx.body.teacher_id || null, class_id: cls.id, section, max_students: Number(ctx.body.max_students) || 40, status: 'planned' };
    db.courses.unshift(c);
    [['Ирц', 10], ['Явцын шалгалт', 20], ['Бие даалт', 10], ['Дунд шалгалт', 20], ['Эцсийн шалгалт', 40]].forEach(([name, max], i) =>
      db.grade_items.push({ id: newId('gi'), course_id: c.id, name: name as string, max_score: max as number, weight: max as number, sort_order: i + 1 }),
    );
    // Сургалтын алба ангиар нь оюутнуудыг автоматаар бүртгэнэ
    db.students.filter((s) => s.class_id === cls.id && s.status === 'active').forEach((s) =>
      db.enrollments.push({ id: newId('enr'), course_id: c.id, student_id: s.id, status: 'enrolled', scores: {}, total_score: null, letter_grade: null, gpa_point: null, grade_status: 'draft', submitted_at: null, approved_at: null }),
    );
    audit(ctx, 'CREATE_COURSE', 'courses', c.id);
    if (c.teacher_id) {
      const t = byId(db.employees, c.teacher_id)!;
      const sub = byId(db.subjects, c.subject_id)!;
      db.notifications.unshift({ id: newId('ntf'), user_id: t.user_id, target_role: null, title: 'Шинэ хичээл оноогдлоо', message: `${sub.name} хичээлийг ${cls.code} ангид заахаар оноолоо.`, type: 'schedule', image_url: null, is_read: false, is_published: true, publish_at: null, expire_at: null, created_by_name: ctx.session.user.full_name, created_at: now() });
    }
    return courseView(c);
  },
  'PATCH /courses/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const c = byId(db.courses, ctx.params.id);
    if (!c) throw new MockHttpError(404, 'Олдсонгүй.');
    if (ctx.body.teacher_id !== undefined && ctx.body.teacher_id !== c.teacher_id) {
      const others = semesterSchedules(c.semester_id).filter((s) => s.course_id !== c.id);
      for (const own of db.schedules.filter((s) => s.course_id === c.id)) {
        const [first] = findConflicts({ ...own, room: null, class_id: c.class_id, teacher_id: ctx.body.teacher_id || null }, others);
        if (first) throw new MockHttpError(409, `Хичээлийн цагтай давхцаж байна: ${conflictMessage(first.kind, first.with)}`);
      }
    }
    Object.assign(c, ctx.body);
    audit(ctx, ctx.body.teacher_id !== undefined ? 'ASSIGN_TEACHER' : 'UPDATE_COURSE', 'courses', c.id, ctx.body);
    return courseView(c);
  },

  // ----- GRADE ITEMS / GRADES -----
  'GET /courses/:id/grade-items': (ctx) => db.grade_items.filter((g) => g.course_id === ctx.params.id).sort((a, b) => a.sort_order - b.sort_order),
  'GET /courses/:id/enrollments': (ctx) => {
    assertTeaches(ctx, ctx.params.id);
    return db.enrollments
      .filter((e) => e.course_id === ctx.params.id)
      .map(enrollmentView)
      .sort((a, b) => (a.student_name ?? '').localeCompare(b.student_name ?? ''));
  },
  'PUT /courses/:id/grades': (ctx) => {
    allow(ctx, 'teacher', 'academic', 'super_admin');
    assertTeaches(ctx, ctx.params.id);
    const items = db.grade_items.filter((g) => g.course_id === ctx.params.id);
    const rows: { enrollment_id: string; scores: Record<string, number> }[] = ctx.body.rows ?? [];
    rows.forEach((r) => {
      const e = byId(db.enrollments, r.enrollment_id);
      if (!e || e.course_id !== ctx.params.id) return;
      if (e.grade_status === 'approved' || e.grade_status === 'submitted') return;
      e.scores = r.scores;
      const { total, complete } = computeTotal(r.scores, items);
      e.total_score = complete ? total : null;
      const g = complete ? scoreToGrade(total) : null;
      e.letter_grade = g?.letter ?? null;
      e.gpa_point = g?.point ?? null;
      e.grade_status = 'draft';
    });
    audit(ctx, 'UPDATE_GRADE', 'enrollments', ctx.params.id);
    return { updated: rows.length };
  },
  'POST /courses/:id/grades/submit': (ctx) => {
    allow(ctx, 'teacher');
    assertTeaches(ctx, ctx.params.id);
    const rows = db.enrollments.filter((e) => e.course_id === ctx.params.id && (e.grade_status === 'draft' || e.grade_status === 'rejected'));
    const incomplete = rows.filter((e) => e.total_score === null);
    if (incomplete.length) throw new MockHttpError(422, `${incomplete.length} оюутны дүн бүрэн биш байна. Бүх бүрэлдэхүүнийг бөглөөд дахин илгээнэ үү.`);
    rows.forEach((e) => {
      e.grade_status = 'submitted';
      e.submitted_at = now();
    });
    audit(ctx, 'SUBMIT_GRADE', 'enrollments', ctx.params.id);
    return { submitted: rows.length };
  },
  'GET /grades/pending': (ctx) => {
    allow(ctx, 'academic', 'super_admin', 'management');
    const groups = new Map<string, Enrollment[]>();
    db.enrollments.filter((e) => e.grade_status === 'submitted').forEach((e) => {
      groups.set(e.course_id, [...(groups.get(e.course_id) ?? []), e]);
    });
    return [...groups.entries()].map(([courseId, rows]) => ({
      course: courseView(byId(db.courses, courseId)!),
      count: rows.length,
      avg_score: avg(rows.map((r) => r.total_score ?? 0)),
      submitted_at: rows[0].submitted_at,
      rows: rows.map(enrollmentView),
    }));
  },
  'POST /grades/approve': (ctx) => {
    allow(ctx, 'academic', 'super_admin');
    const course_id: string = ctx.body.course_id;
    const rows = db.enrollments.filter((e) => e.course_id === course_id && e.grade_status === 'submitted');
    rows.forEach((e) => {
      e.grade_status = 'approved';
      e.approved_at = now();
      recomputeStudentGpa(e.student_id);
      const s = byId(db.students, e.student_id)!;
      const sub = byId(db.subjects, byId(db.courses, course_id)!.subject_id)!;
      db.notifications.unshift({ id: newId('ntf'), user_id: s.user_id, target_role: null, title: 'Шинэ дүн баталгаажлаа', message: `${sub.name} хичээлийн таны дүн баталгаажлаа.`, type: 'grade', image_url: null, is_read: false, is_published: true, publish_at: null, expire_at: null, created_by_name: ctx.session.user.full_name, created_at: now() });
    });
    audit(ctx, 'APPROVE_GRADE', 'enrollments', course_id);
    return { approved: rows.length };
  },
  'POST /grades/reject': (ctx) => {
    allow(ctx, 'academic', 'super_admin');
    const course_id: string = ctx.body.course_id;
    const rows = db.enrollments.filter((e) => e.course_id === course_id && e.grade_status === 'submitted');
    rows.forEach((e) => (e.grade_status = 'rejected'));
    const course = byId(db.courses, course_id)!;
    const teacher = byId(db.employees, course.teacher_id);
    if (teacher) {
      db.notifications.unshift({ id: newId('ntf'), user_id: teacher.user_id, target_role: null, title: 'Дүн буцаагдлаа', message: ctx.body.reason || 'Сургалтын алба дүнг засварлуулахаар буцаалаа.', type: 'grade', image_url: null, is_read: false, is_published: true, publish_at: null, expire_at: null, created_by_name: ctx.session.user.full_name, created_at: now() });
    }
    audit(ctx, 'REJECT_GRADE', 'enrollments', course_id, { reason: ctx.body.reason });
    return { rejected: rows.length };
  },
  'GET /grades/me': (ctx) => {
    allow(ctx, 'student');
    return db.enrollments
      .filter((e) => e.student_id === ctx.session.student?.id)
      .map(enrollmentView)
      .map((e) => {
        const items = db.grade_items.filter((i) => i.course_id === e.course_id).sort((a, b) => a.sort_order - b.sort_order);
        const scores = e.scores ?? {};
        const graded = items.filter((i) => typeof scores[i.id] === 'number');
        const earned = graded.reduce((sum, i) => sum + Number(scores[i.id]), 0);
        const gradedMax = graded.reduce((sum, i) => sum + i.max_score, 0);
        const totalMax = items.reduce((sum, i) => sum + i.max_score, 0);
        const approved = e.grade_status === 'approved';
        return {
          ...e,
          total_score: approved ? e.total_score : null,
          letter_grade: approved ? e.letter_grade : null,
          gpa_point: approved ? e.gpa_point : null,
          progress: {
            items: items.map((i) => ({ id: i.id, name: i.name, max_score: i.max_score, score: typeof scores[i.id] === 'number' ? scores[i.id] : null })),
            earned: Math.round(earned * 100) / 100,
            graded_max: gradedMax,
            total_max: totalMax,
            percent: gradedMax ? Math.round((earned / gradedMax) * 1000) / 10 : null,
            collected_percent: totalMax ? Math.round((earned / totalMax) * 1000) / 10 : null,
            remaining_max: Math.max(0, totalMax - gradedMax),
          },
        };
      });
  },

  // ----- ATTENDANCE -----
  'GET /courses/:id/attendance': (ctx) => {
    assertTeaches(ctx, ctx.params.id);
    return db.attendance.filter((a) => a.course_id === ctx.params.id && (!ctx.query.date || a.attendance_date === ctx.query.date));
  },
  'GET /courses/:id/attendance-dates': (ctx) => {
    assertTeaches(ctx, ctx.params.id);
    return [...new Set(db.attendance.filter((a) => a.course_id === ctx.params.id).map((a) => a.attendance_date))].sort().reverse();
  },
  'PUT /courses/:id/attendance': (ctx) => {
    allow(ctx, 'teacher', 'super_admin');
    assertTeaches(ctx, ctx.params.id);
    const date: string = ctx.body.date;
    const rows: { student_id: string; status: AttendanceStatus; note?: string }[] = ctx.body.rows ?? [];
    rows.forEach((r) => {
      const existing = db.attendance.find((a) => a.course_id === ctx.params.id && a.student_id === r.student_id && a.attendance_date === date);
      if (existing) {
        existing.status = r.status;
        existing.note = r.note ?? null;
      } else {
        db.attendance.push({ id: newId('att'), course_id: ctx.params.id, student_id: r.student_id, attendance_date: date, status: r.status, note: r.note ?? null });
      }
    });
    audit(ctx, 'UPDATE_ATTENDANCE', 'attendance', ctx.params.id, { date });
    return { saved: rows.length };
  },
  'GET /attendance/me': (ctx) => {
    allow(ctx, 'student');
    return db.attendance
      .filter((a) => a.student_id === ctx.session.student?.id)
      .map((a) => ({ ...a, subject_name: courseView(byId(db.courses, a.course_id)!).subject_name }))
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  },

  // ----- SCHEDULES -----
  'GET /schedules': (ctx) => {
    const { course_id, class_id, teacher_id, room } = ctx.query;
    const semesterId = ctx.query.semester_id ?? CURRENT_SEMESTER_ID;
    let courses = db.courses.filter((c) => c.semester_id === semesterId);
    const role = ctx.session.user.role;
    // Багш ҮРГЭЛЖ зөвхөн өөрийн хичээлийн цагийг харна
    if (role === 'teacher') courses = courses.filter((c) => c.teacher_id === ctx.session.employee?.id);
    else if (role === 'student') {
      const ids = new Set(db.enrollments.filter((e) => e.student_id === ctx.session.student?.id).map((e) => e.course_id));
      courses = courses.filter((c) => ids.has(c.id));
    } else if (teacher_id) courses = courses.filter((c) => c.teacher_id === teacher_id);
    if (class_id) courses = courses.filter((c) => c.class_id === class_id);
    const ids = new Set(courses.map((c) => c.id));
    return db.schedules
      .filter((s) => ids.has(s.course_id) && (!course_id || s.course_id === course_id))
      .filter((s) => !room || role === 'teacher' || role === 'student' || (s.room ?? '').toLowerCase() === room.toLowerCase())
      .map(scheduleView)
      .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  },
  'GET /schedules/conflicts': (ctx) => {
    allow(ctx, 'academic', 'management', 'super_admin');
    const semesterId = ctx.query.semester_id ?? CURRENT_SEMESTER_ID;
    return findAllConflicts(semesterSchedules(semesterId)).map((p) => ({ kind: p.kind, a: p.a, b: p.b }));
  },
  'POST /schedules': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'course_ids', 'day_of_week', 'start_time', 'end_time');
    const b = ctx.body;
    const courseIds: string[] = [...new Set(b.course_ids as string[])];
    const courses = courseIds.map((id) => byId(db.courses, id));
    if (courses.some((c) => !c)) throw new MockHttpError(404, 'Зарим хичээл олдсонгүй.');
    if (new Set(courses.map((c) => c!.semester_id)).size > 1) throw new MockHttpError(422, 'Нэгдсэн лекцийн хичээлүүд нэг улиралд байх ёстой.');
    const classIds = courses.map((c) => c!.class_id);
    if (new Set(classIds).size !== classIds.length) throw new MockHttpError(422, 'Нэг ангийг хоёр удаа сонгосон байна.');
    const teachers = new Set(courses.map((c) => c!.teacher_id).filter(Boolean));
    if (courseIds.length > 1 && teachers.size > 1) throw new MockHttpError(422, 'Нэгдсэн лекцийг нэг багш заана.');
    const sessionType = b.session_type ?? 'lecture';
    if (courseIds.length > 1 && sessionType !== 'lecture' && sessionType !== 'exam') {
      throw new MockHttpError(422, 'Зөвхөн лекц, шалгалтыг хэд хэдэн ангид нэгтгэж болно.');
    }
    const isOnline = !!b.is_online;
    if (!isOnline && !b.room) throw new MockHttpError(422, 'Танхимын хичээлд өрөө сонгоно уу.');

    const groupId = courseIds.length > 1 ? newId('grp') : null;
    const shared = {
      day_of_week: Number(b.day_of_week),
      start_time: `${String(b.start_time).slice(0, 5)}:00`,
      end_time: `${String(b.end_time).slice(0, 5)}:00`,
      room: isOnline ? null : String(b.room).trim(),
      building: isOnline ? null : b.building || null,
      session_type: sessionType,
      is_online: isOnline,
      note: b.note || null,
      group_id: groupId,
    };

    const created: ScheduleRecord[] = courseIds.map((course_id) => ({ id: newId('sch'), course_id, ...shared }));
    created.forEach((row) => assertScheduleFree(row));
    db.schedules.push(...created);
    audit(ctx, groupId ? 'CREATE_MERGED_SCHEDULE' : 'CREATE_SCHEDULE', 'schedules', created[0].id, { courses: courseIds });
    return { schedules: created.map(scheduleView), warnings: capacityWarnings(created) };
  },
  'PATCH /schedules/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const current = byId(db.schedules, ctx.params.id);
    if (!current) throw new MockHttpError(404, 'Хуваарь олдсонгүй.');
    const b = ctx.body;
    const group = current.group_id ? db.schedules.filter((s) => s.group_id === current.group_id) : [current];

    const patch = {
      day_of_week: b.day_of_week !== undefined ? Number(b.day_of_week) : current.day_of_week,
      start_time: b.start_time ? `${String(b.start_time).slice(0, 5)}:00` : current.start_time,
      end_time: b.end_time ? `${String(b.end_time).slice(0, 5)}:00` : current.end_time,
      session_type: b.session_type ?? current.session_type ?? 'lecture',
      is_online: b.is_online !== undefined ? !!b.is_online : !!current.is_online,
      note: b.note !== undefined ? b.note || null : current.note ?? null,
      room: b.room !== undefined ? (b.room ? String(b.room).trim() : null) : current.room,
      building: b.building !== undefined ? b.building || null : current.building,
    };
    if (patch.is_online) {
      patch.room = null;
      patch.building = null;
    } else if (!patch.room) throw new MockHttpError(422, 'Танхимын хичээлд өрөө сонгоно уу.');

    group.forEach((row) => assertScheduleFree({ ...row, ...patch }));
    group.forEach((row) => Object.assign(row, patch));
    audit(ctx, 'UPDATE_SCHEDULE', 'schedules', current.id, b);
    return { schedules: group.map(scheduleView), warnings: capacityWarnings(group) };
  },
  'DELETE /schedules/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const current = byId(db.schedules, ctx.params.id);
    if (!current) throw new MockHttpError(404, 'Хуваарь олдсонгүй.');
    const withGroup = ctx.query.group === 'true' && !!current.group_id;
    const targets = withGroup ? db.schedules.filter((s) => s.group_id === current.group_id) : [current];
    targets.forEach((t) => db.schedules.splice(db.schedules.indexOf(t), 1));
    audit(ctx, 'DELETE_SCHEDULE', 'schedules', current.id, { group: withGroup });
    return { deleted: true, count: targets.length };
  },
  'GET /schedules/suggestions': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const courseIds = String(ctx.query.course_ids ?? '').split(',').filter(Boolean);
    const courses = courseIds.map((id) => byId(db.courses, id)).filter(Boolean);
    if (!courses.length) throw new MockHttpError(404, 'Хичээл олдсонгүй.');
    const semesterId = courses[0]!.semester_id;
    const existing = semesterSchedules(semesterId);
    const seats = courseIds.reduce((sum, id) => sum + db.enrollments.filter((e) => e.course_id === id && e.status !== 'dropped').length, 0);

    const slots: { day_of_week: number; start_time: string; end_time: string; rooms: { building: string; code: string; capacity: number }[] }[] = [];
    WEEK_DAYS.forEach((day) => {
      TIME_SLOTS.forEach((slot) => {
        const blocked = courses.some((c) =>
          findConflicts(
            { course_id: c!.id, class_id: c!.class_id, teacher_id: c!.teacher_id, day_of_week: day, start_time: slot.start, end_time: slot.end, room: null, building: null, is_online: true },
            existing,
          ).length > 0,
        );
        if (blocked) return;
        const busy = new Set(
          existing
            .filter((e) => !e.is_online && e.room && overlaps(e, { day_of_week: day, start_time: slot.start, end_time: slot.end }))
            .map((e) => `${e.building ?? ''}|${(e.room ?? '').toLowerCase()}`),
        );
        const free = db.rooms
          .filter((r) => r.is_active && r.capacity >= seats && !busy.has(`${r.building}|${r.code.toLowerCase()}`))
          .sort((a, b) => a.capacity - b.capacity)
          .slice(0, 5)
          .map((r) => ({ building: r.building, code: r.code, capacity: r.capacity }));
        slots.push({ day_of_week: day, start_time: slot.start, end_time: slot.end, rooms: free });
      });
    });
    return { total_students: seats, slots: slots.slice(0, 20) };
  },

  // ----- ROOMS -----
  'GET /rooms': (ctx) => {
    const semesterId = ctx.query.semester_id ?? CURRENT_SEMESTER_ID;
    const day = ctx.query.day_of_week ? Number(ctx.query.day_of_week) : undefined;
    const start = ctx.query.start_time;
    const end = ctx.query.end_time;
    const schedules = semesterSchedules(semesterId);
    return db.rooms
      .filter((r) => r.is_active && (!ctx.query.building || r.building === ctx.query.building))
      .map((r) => {
        const rows = schedules.filter((s) => !s.is_online && (s.room ?? '').toLowerCase() === r.code.toLowerCase() && (s.building ?? '') === r.building);
        const clash = day && start && end ? rows.find((s) => overlaps(s, { day_of_week: day, start_time: start, end_time: end })) : undefined;
        return { ...r, weekly_sessions: rows.length, busy: !!clash, busy_with: clash ? `${clash.subject_name}, ${clash.class_name}` : null };
      });
  },
  'POST /rooms': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    required(ctx.body, 'building', 'code', 'capacity');
    if (db.rooms.some((r) => r.building === ctx.body.building && r.code === ctx.body.code)) throw new MockHttpError(409, 'Ийм өрөө бүртгэлтэй байна.');
    const room = { id: newId('room'), building: ctx.body.building, code: String(ctx.body.code).trim(), capacity: Number(ctx.body.capacity), room_type: ctx.body.room_type ?? 'lecture', note: ctx.body.note || null, is_active: true };
    db.rooms.push(room);
    audit(ctx, 'CREATE_ROOM', 'rooms', room.id);
    return room;
  },
  'PATCH /rooms/:id': (ctx) => {
    allow(ctx, 'super_admin', 'academic');
    const room = db.rooms.find((r) => r.id === ctx.params.id);
    if (!room) throw new MockHttpError(404, 'Өрөө олдсонгүй.');
    Object.assign(room, ctx.body, ctx.body.capacity ? { capacity: Number(ctx.body.capacity) } : {});
    return room;
  },

  // ----- COURSE MATERIALS -----
  'GET /courses/:id/materials': (ctx) => {
    assertCourseView(ctx, ctx.params.id);
    return db.course_materials
      .filter((m) => m.course_id === ctx.params.id && (ctx.session.user.role !== 'student' || m.is_published))
      .map(materialView)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  'GET /courses/:id/materials/stats': (ctx) => {
    allow(ctx, 'teacher', 'academic', 'management', 'super_admin');
    assertCourseView(ctx, ctx.params.id);
    const materials = db.course_materials.filter((m) => m.course_id === ctx.params.id);
    const total_students = db.enrollments.filter((e) => e.course_id === ctx.params.id && e.status !== 'dropped').length;
    const by_material: Record<string, { students: number; downloads: number }> = {};
    materials.forEach((m) => {
      const rows = db.material_access.filter((a) => a.material_id === m.id);
      by_material[m.id] = { students: rows.length, downloads: rows.reduce((sum, r) => sum + r.download_count, 0) };
    });
    return { total_students, by_material };
  },
  'GET /materials/me': (ctx) => {
    allow(ctx, 'student');
    const ids = new Set(db.enrollments.filter((e) => e.student_id === ctx.session.student?.id && e.status !== 'dropped').map((e) => e.course_id));
    return db.course_materials
      .filter((m) => ids.has(m.course_id) && m.is_published)
      .map(materialView)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  'POST /courses/:id/materials/upload-url': (ctx) => {
    allow(ctx, 'teacher', 'academic', 'super_admin');
    assertCourseView(ctx, ctx.params.id);
    required(ctx.body, 'file_name', 'mime_type', 'size_bytes');
    if (Number(ctx.body.size_bytes) > 50 * 1024 * 1024) throw new MockHttpError(422, 'Файлын хэмжээ 50MB-аас хэтэрсэн байна.');
    return { path: `${ctx.params.id}/${newId('file')}`, token: 'mock-token', signed_url: '', bucket: 'course-materials' };
  },
  'POST /courses/:id/materials': (ctx) => {
    allow(ctx, 'teacher', 'academic', 'super_admin');
    assertCourseView(ctx, ctx.params.id);
    required(ctx.body, 'title', 'file_path', 'file_name');
    const m: CourseMaterial = {
      id: newId('mat'),
      course_id: ctx.params.id,
      uploaded_by: ctx.session.user.id,
      title: ctx.body.title,
      description: ctx.body.description || null,
      file_path: ctx.body.file_path,
      file_name: ctx.body.file_name,
      mime_type: ctx.body.mime_type || null,
      size_bytes: Number(ctx.body.size_bytes) || 0,
      is_published: ctx.body.is_published !== false,
      created_at: now(),
    };
    db.course_materials.unshift(m);
    audit(ctx, 'ADD_MATERIAL', 'course_materials', m.id, { title: m.title });
    return materialView(m);
  },
  'GET /materials/:id/download': (ctx) => materialLink(ctx, 'download'),
  'GET /materials/:id/view': (ctx) => materialLink(ctx, 'inline'),
  'GET /materials/:id/access': (ctx) => {
    allow(ctx, 'teacher', 'academic', 'management', 'super_admin');
    const m = byId(db.course_materials, ctx.params.id);
    if (!m) throw new MockHttpError(404, 'Материал олдсонгүй.');
    assertCourseView(ctx, m.course_id);
    const access = db.material_access.filter((a) => a.material_id === m.id);
    const students = db.enrollments
      .filter((e) => e.course_id === m.course_id && e.status !== 'dropped')
      .map((e) => {
        const a = access.find((x) => x.student_id === e.student_id);
        const s = studentView(e.student_id);
        return {
          student_id: e.student_id,
          student_code: s.student_code,
          student_name: s.full_name,
          downloaded: !!a,
          download_count: a?.download_count ?? 0,
          first_at: a?.first_at ?? null,
          last_at: a?.last_at ?? null,
        };
      })
      .sort((a, b) => Number(b.downloaded) - Number(a.downloaded) || a.student_name.localeCompare(b.student_name));
    return { material: { id: m.id, title: m.title }, total_students: students.length, downloaded_count: students.filter((x) => x.downloaded).length, students };
  },
  'PATCH /materials/:id': (ctx) => {
    const m = materialForWrite(ctx, ctx.params.id);
    Object.assign(m, ctx.body);
    audit(ctx, 'UPDATE_MATERIAL', 'course_materials', m.id, ctx.body);
    return materialView(m);
  },
  'DELETE /materials/:id': (ctx) => {
    const m = materialForWrite(ctx, ctx.params.id);
    db.course_materials.splice(db.course_materials.indexOf(m), 1);
    audit(ctx, 'DELETE_MATERIAL', 'course_materials', m.id);
    return { deleted: true };
  },

  // ----- INVOICES / PAYMENTS -----
  'GET /invoices': (ctx) => {
    allow(ctx, 'finance', 'super_admin', 'management');
    const { status, semester_id, q } = ctx.query;
    return db.invoices
      .filter((i) => (!status || i.status === status) && (!semester_id || i.semester_id === semester_id))
      .map(invoiceView)
      .filter((i) => matches(i.student_name, q) || matches(i.student_code, q) || matches(i.invoice_number, q))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  'POST /invoices': (ctx) => {
    allow(ctx, 'finance', 'super_admin');
    required(ctx.body, 'student_id', 'tuition_amount');
    const tuition = Number(ctx.body.tuition_amount);
    const discount = Number(ctx.body.discount_amount) || 0;
    if (discount > tuition) throw new MockHttpError(422, 'Хөнгөлөлт төлбөрийн дүнгээс их байж болохгүй.');
    const inv: Invoice = { id: newId('inv'), student_id: ctx.body.student_id, semester_id: ctx.body.semester_id || CURRENT_SEMESTER_ID, invoice_number: `INV-2026-${String(db.invoices.length + 1).padStart(5, '0')}`, tuition_amount: tuition, discount_amount: discount, discount_note: ctx.body.discount_note || null, net_amount: tuition - discount, paid_amount: 0, due_date: ctx.body.due_date || null, status: 'pending', description: ctx.body.description || null, created_at: now() };
    db.invoices.unshift(inv);
    syncInvoice(inv.id);
    audit(ctx, 'CREATE_INVOICE', 'invoices', inv.id);
    return invoiceView(inv);
  },
  'PATCH /invoices/:id': (ctx) => {
    allow(ctx, 'finance', 'super_admin');
    const inv = byId(db.invoices, ctx.params.id);
    if (!inv) throw new MockHttpError(404, 'Нэхэмжлэл олдсонгүй.');
    const next = { ...ctx.body };
    if (next.discount_amount !== undefined) next.discount_amount = Number(next.discount_amount);
    if ((next.discount_amount ?? inv.discount_amount) > inv.tuition_amount) throw new MockHttpError(422, 'Хөнгөлөлт төлбөрийн дүнгээс их байж болохгүй.');
    Object.assign(inv, next);
    syncInvoice(inv.id);
    audit(ctx, 'UPDATE_INVOICE', 'invoices', inv.id, ctx.body);
    return invoiceView(inv);
  },
  'GET /invoices/me': (ctx) => {
    allow(ctx, 'student');
    return db.invoices.filter((i) => i.student_id === ctx.session.student?.id).map(invoiceView).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  'GET /payments': (ctx) => {
    allow(ctx, 'finance', 'super_admin', 'management');
    return db.payments
      .map(paymentView)
      .filter((p) => (!ctx.query.method || p.method === ctx.query.method) && (matches(p.student_name, ctx.query.q) || matches(p.invoice_number, ctx.query.q) || matches(p.student_code, ctx.query.q)))
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  },
  'POST /payments': (ctx) => {
    allow(ctx, 'finance', 'super_admin');
    required(ctx.body, 'invoice_id', 'amount', 'method');
    const inv = byId(db.invoices, ctx.body.invoice_id);
    if (!inv) throw new MockHttpError(404, 'Нэхэмжлэл олдсонгүй.');
    if (inv.status === 'cancelled') throw new MockHttpError(422, 'Цуцалсан нэхэмжлэлд төлөлт бүртгэх боломжгүй.');
    const amount = Number(ctx.body.amount);
    if (amount <= 0) throw new MockHttpError(422, 'Төлөлтийн дүн 0-ээс их байх ёстой.');
    const p: Payment = { id: newId('pay'), invoice_id: inv.id, student_id: inv.student_id, amount, method: ctx.body.method, transaction_reference: ctx.body.transaction_reference || null, payment_date: ctx.body.payment_date ? new Date(ctx.body.payment_date).toISOString() : now(), description: ctx.body.description || null };
    db.payments.push(p);
    syncInvoice(inv.id);
    const s = byId(db.students, inv.student_id)!;
    db.notifications.unshift({ id: newId('ntf'), user_id: s.user_id, target_role: null, title: 'Төлбөр хүлээн авлаа', message: `${amount.toLocaleString('en-US')}₮ төлбөр амжилттай бүртгэгдлээ.`, type: 'finance', image_url: null, is_read: false, is_published: true, publish_at: null, expire_at: null, created_by_name: ctx.session.user.full_name, created_at: now() });
    audit(ctx, 'RECORD_PAYMENT', 'payments', p.id, { amount });
    return paymentView(p);
  },
  'GET /payments/me': (ctx) => {
    allow(ctx, 'student');
    return db.payments.filter((p) => p.student_id === ctx.session.student?.id).map(paymentView).sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  },

  // ----- NOTIFICATIONS -----
  'GET /notifications': (ctx) => {
    const { user } = ctx.session;
    const scope = ctx.query.scope;
    const nowIso = now();
    return db.notifications
      .filter((n) => {
        if (scope === 'announcements') return n.user_id === null;
        return n.user_id === user.id || (n.user_id === null && n.is_published && (!n.target_role || n.target_role === user.role) && (!n.publish_at || n.publish_at <= nowIso) && (!n.expire_at || n.expire_at >= nowIso));
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  'POST /notifications': (ctx) => {
    allow(ctx, 'academic', 'management', 'super_admin');
    required(ctx.body, 'title', 'message');
    const n: Notification = { id: newId('ntf'), user_id: null, target_role: ctx.body.target_role || null, title: ctx.body.title, message: ctx.body.message, type: 'announcement', image_url: ctx.body.image_url || null, is_read: false, is_published: ctx.body.is_published ?? true, publish_at: ctx.body.publish_at || null, expire_at: ctx.body.expire_at || null, created_by_name: ctx.session.user.full_name, created_at: now() };
    db.notifications.unshift(n);
    audit(ctx, 'PUBLISH_ANNOUNCEMENT', 'notifications', n.id);
    return n;
  },
  'PATCH /notifications/:id': (ctx) => {
    const n = byId(db.notifications, ctx.params.id);
    if (!n) throw new MockHttpError(404, 'Олдсонгүй.');
    const staff = ['academic', 'management', 'super_admin'].includes(ctx.session.user.role);
    if (!staff && n.user_id !== ctx.session.user.id && ctx.body.is_read === undefined) throw new MockHttpError(403, 'Хандах эрхгүй.');
    Object.assign(n, staff ? ctx.body : { is_read: ctx.body.is_read });
    return n;
  },
  'POST /notifications/read-all': (ctx) => {
    db.notifications.filter((n) => n.user_id === ctx.session.user.id).forEach((n) => (n.is_read = true));
    return { ok: true };
  },
  'DELETE /notifications/:id': (ctx) => {
    allow(ctx, 'academic', 'management', 'super_admin');
    const i = db.notifications.findIndex((n) => n.id === ctx.params.id);
    if (i >= 0) db.notifications.splice(i, 1);
    return { deleted: true };
  },

  // ----- CERTIFICATES -----
  'POST /certificates': (ctx) => {
    allow(ctx, 'student');
    const student = ctx.session.student!;
    if (student.status !== 'active') throw new MockHttpError(422, 'Суралцаж буй төлөвтэй оюутан тодорхойлолт авах боломжтой.');
    const semester = db.semesters.find((s) => s.is_current);
    const yearLevel = student.enrollment_year ? Math.max(1, new Date().getFullYear() - Number(student.enrollment_year) + 1) : null;
    const includeGpa = ctx.body.include_gpa === true;
    const validDays = Number(ctx.body.valid_days) || 30;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const cert = {
      id: newId('cert'),
      student_id: student.id,
      number: `ТОД-${new Date().getFullYear()}-${String(db.student_certificates.length + 1).padStart(5, '0')}`,
      verify_code: Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
      purpose: ctx.body.purpose ?? 'other',
      purpose_note: ctx.body.purpose_note || null,
      include_gpa: includeGpa,
      snapshot: {
        full_name: student.full_name,
        last_name: student.last_name,
        first_name: student.first_name,
        student_code: student.student_code,
        register_number: student.register_number,
        program_name: student.program_name,
        department_name: student.department_name,
        class_name: student.class_name,
        year_level: yearLevel,
        enrollment_year: student.enrollment_year,
        status: student.status,
        semester: semester ? `${semester.academic_year} оны ${semester.name}` : null,
        course_count: db.enrollments.filter((e) => e.student_id === student.id).length,
        gpa: includeGpa ? student.gpa : null,
        earned_credits: includeGpa ? student.earned_credits : null,
      },
      issued_at: now(),
      valid_until: new Date(Date.now() + validDays * 86400000).toISOString().slice(0, 10),
      revoked_at: null,
      is_valid: true,
      student_code: student.student_code,
      student_name: student.full_name,
    };
    db.student_certificates.unshift(cert);
    audit(ctx, 'ISSUE_CERTIFICATE', 'student_certificates', cert.id, { number: cert.number });
    return cert;
  },
  'GET /certificates/me': (ctx) => {
    allow(ctx, 'student');
    return db.student_certificates.filter((c) => c.student_id === ctx.session.student?.id).map(certificateView);
  },
  'GET /certificates': (ctx) => {
    allow(ctx, 'academic', 'management', 'super_admin');
    const q = String(ctx.query.q ?? '').toLowerCase();
    return db.student_certificates
      .map(certificateView)
      .filter((c) => !q || [c.student_name, c.student_code, c.number, c.verify_code].some((v) => String(v ?? '').toLowerCase().includes(q)));
  },
  'GET /certificates/:id': (ctx) => {
    const c = db.student_certificates.find((x) => x.id === ctx.params.id);
    if (!c) throw new MockHttpError(404, 'Тодорхойлолт олдсонгүй.');
    const isStaff = ['super_admin', 'academic', 'management'].includes(ctx.session.user.role);
    if (!isStaff && c.student_id !== ctx.session.student?.id) throw new MockHttpError(403, 'Хандах эрхгүй.');
    return certificateView(c);
  },
  'POST /certificates/:id/revoke': (ctx) => {
    allow(ctx, 'academic', 'super_admin');
    const c = db.student_certificates.find((x) => x.id === ctx.params.id);
    if (!c) throw new MockHttpError(404, 'Тодорхойлолт олдсонгүй.');
    c.revoked_at = now();
    audit(ctx, 'REVOKE_CERTIFICATE', 'student_certificates', c.id);
    return certificateView(c);
  },
  'GET /certificates/verify/:code': (ctx) => {
    const c = db.student_certificates.find((x) => x.verify_code.toUpperCase() === String(ctx.params.code).toUpperCase());
    if (!c) throw new MockHttpError(404, 'Ийм кодтой тодорхойлолт олдсонгүй.');
    const valid = !c.revoked_at && (!c.valid_until || c.valid_until >= new Date().toISOString().slice(0, 10));
    return {
      number: c.number,
      full_name: c.snapshot.full_name,
      student_code: c.snapshot.student_code,
      program_name: c.snapshot.program_name,
      class_name: c.snapshot.class_name,
      status: c.snapshot.status,
      issued_at: c.issued_at,
      valid_until: c.valid_until,
      is_valid: valid,
      revoked: !!c.revoked_at,
    };
  },

  // ----- AUDIT -----
  'GET /audit-logs': (ctx) => {
    allow(ctx, 'super_admin');
    return db.audit_logs
      .map((a) => ({ ...a, user_name: byId(db.users, a.user_id)?.full_name ?? null }))
      .filter((a) => (!ctx.query.action || a.action === ctx.query.action) && (!ctx.query.table || a.table_name === ctx.query.table))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  // ----- REPORTS -----
  'GET /reports/overview': (ctx): OverviewReport => {
    allow(ctx, ...STAFF);
    const active = db.students.filter((s) => s.status === 'active');
    const billed = db.invoices.filter((i) => i.semester_id === CURRENT_SEMESTER_ID && i.status !== 'cancelled');
    const net = billed.reduce((s, i) => s + i.net_amount, 0);
    const paid = billed.reduce((s, i) => s + i.paid_amount, 0);
    return {
      total_students: active.length,
      total_teachers: db.employees.filter((e) => e.employee_type === 'teacher' && e.is_active).length,
      total_schools: db.departments.filter((d) => d.level === 'school').length,
      total_subjects: db.subjects.length,
      active_courses: db.courses.filter((c) => c.status === 'active').length,
      avg_gpa: avg(active.map((s) => s.gpa ?? 0).filter(Boolean)),
      avg_attendance: attendanceRate(db.attendance),
      collection_rate: net ? Math.round((paid / net) * 1000) / 10 : 0,
    };
  },
  'GET /reports/schools': (ctx): SchoolReport[] => {
    allow(ctx, ...STAFF);
    return db.departments
      .filter((d) => d.level === 'school')
      .map((school) => {
        const deptIds = new Set(db.departments.filter((d) => d.parent_id === school.id).map((d) => d.id));
        const programIds = new Set(db.programs.filter((p) => deptIds.has(p.department_id)).map((p) => p.id));
        const students = db.students.filter((s) => s.program_id && programIds.has(s.program_id));
        const studentIds = new Set(students.map((s) => s.id));
        return {
          id: school.id,
          name: school.name,
          students: students.length,
          teachers: db.employees.filter((e) => e.employee_type === 'teacher' && e.department_id && deptIds.has(e.department_id)).length,
          classes: db.classes.filter((c) => programIds.has(c.program_id)).length,
          programs: programIds.size,
          avg_gpa: avg(students.map((s) => s.gpa ?? 0).filter(Boolean)),
          avg_attendance: attendanceRate(db.attendance.filter((a) => studentIds.has(a.student_id))),
        };
      });
  },
  'GET /reports/departments': (ctx): DepartmentReport[] => {
    allow(ctx, ...STAFF);
    return db.departments
      .filter((d) => d.level === 'department' && (!ctx.query.school_id || d.parent_id === ctx.query.school_id))
      .map((dep) => {
        const programIds = new Set(db.programs.filter((p) => p.department_id === dep.id).map((p) => p.id));
        const students = db.students.filter((s) => s.program_id && programIds.has(s.program_id));
        const ids = new Set(students.map((s) => s.id));
        return {
          id: dep.id,
          name: dep.name,
          students: students.length,
          teachers: db.employees.filter((e) => e.department_id === dep.id && e.employee_type === 'teacher').length,
          subjects: db.subjects.filter((s) => s.department_id === dep.id).length,
          classes: db.classes.filter((c) => programIds.has(c.program_id)).length,
          avg_gpa: avg(students.map((s) => s.gpa ?? 0).filter(Boolean)),
          avg_attendance: attendanceRate(db.attendance.filter((a) => ids.has(a.student_id))),
        };
      });
  },
  'GET /reports/courses/:id': (ctx): CourseStats => {
    assertTeaches(ctx, ctx.params.id);
    const enr = db.enrollments.filter((e) => e.course_id === ctx.params.id);
    const att = db.attendance.filter((a) => a.course_id === ctx.params.id);
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    const items = db.grade_items.filter((g) => g.course_id === ctx.params.id);
    const graded = enr.filter((e) => e.letter_grade);
    graded.forEach((e) => {
      const b = letterBucket(e.letter_grade);
      if (b) distribution[b]++;
    });
    const partialTotals = enr.map((e) => computeTotal(e.scores, items).total);
    const byStatus: Record<string, number> = {};
    att.forEach((a) => (byStatus[a.status] = (byStatus[a.status] ?? 0) + 1));
    return {
      course_id: ctx.params.id,
      student_count: enr.length,
      graded_count: graded.length,
      avg_attendance: attendanceRate(att),
      avg_score: avg(graded.length ? graded.map((e) => e.total_score ?? 0) : partialTotals),
      distribution,
      attendance_by_status: byStatus,
    };
  },
  'GET /reports/finance': (ctx): FinanceReport => {
    allow(ctx, 'finance', 'super_admin', 'management');
    const semester = ctx.query.semester_id ?? CURRENT_SEMESTER_ID;
    const inv = db.invoices.filter((i) => i.semester_id === semester && i.status !== 'cancelled');
    const invIds = new Set(inv.map((i) => i.id));
    const by_status: Record<string, number> = {};
    inv.forEach((i) => (by_status[i.status] = (by_status[i.status] ?? 0) + 1));
    const by_method: Record<string, number> = {};
    db.payments.filter((p) => invIds.has(p.invoice_id)).forEach((p) => (by_method[p.method] = (by_method[p.method] ?? 0) + p.amount));
    const schoolMap = new Map<string, { name: string; billed: number; paid: number }>();
    inv.forEach((i) => {
      const s = byId(db.students, i.student_id)!;
      const school = schoolOf(byId(db.programs, s.program_id)?.department_id);
      if (!school) return;
      const row = schoolMap.get(school.id) ?? { name: school.name, billed: 0, paid: 0 };
      row.billed += i.net_amount;
      row.paid += i.paid_amount;
      schoolMap.set(school.id, row);
    });
    return {
      total_billed: inv.reduce((s, i) => s + i.tuition_amount, 0),
      total_discount: inv.reduce((s, i) => s + i.discount_amount, 0),
      total_paid: inv.reduce((s, i) => s + i.paid_amount, 0),
      total_outstanding: inv.reduce((s, i) => s + Math.max(0, i.net_amount - i.paid_amount), 0),
      by_status,
      by_method,
      by_school: [...schoolMap.values()].sort((a, b) => b.billed - a.billed),
    };
  },
  'GET /reports/student-summary': (ctx): StudentSummary => {
    allow(ctx, 'student');
    const sid = ctx.session.student!.id;
    const s = byId(db.students, sid)!;
    const current = db.enrollments.filter((e) => e.student_id === sid && byId(db.courses, e.course_id)?.semester_id === CURRENT_SEMESTER_ID);
    const prevApproved = db.enrollments
      .filter((e) => e.student_id === sid && e.grade_status === 'approved')
      .map((e) => ({ credit: byId(db.subjects, byId(db.courses, e.course_id)!.subject_id)!.credit, gpa_point: e.gpa_point }));
    const balance = db.invoices.filter((i) => i.student_id === sid && i.status !== 'cancelled').reduce((sum, i) => sum + Math.max(0, i.net_amount - i.paid_amount), 0);
    return {
      gpa: s.gpa,
      semester_gpa: weightedGpa(prevApproved),
      earned_credits: s.earned_credits,
      attendance_rate: attendanceRate(db.attendance.filter((a) => a.student_id === sid)),
      balance,
      course_count: current.length,
    };
  },
};
