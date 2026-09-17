/**
 * Express API-гүйгээр Supabase руу шууд холбогдох горим (VITE_DATA_SOURCE=supabase).
 * Mock handler-уудтай ижил URL, ижил `{ data }` хариу буцаадаг тул хуудсууд өөрчлөгдөхгүй.
 * Эрхийн хяналтыг Supabase RLS policy гүйцэтгэнэ.
 */
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { PostgrestError } from '@supabase/supabase-js';
import type {
  AttendanceStatus, Course, Enrollment, EmployeeView, GradeItem, Invoice, Payment, Schedule, Session, StudentView,
} from '@/types/models';
import { computeTotal, letterBucket, scoreToGrade, weightedGpa } from './gpa';
import { conflictMessage, findAllConflicts, findConflicts } from '@/features/schedules/lib/timetable';
import { supabase } from './supabase';

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Ctx = { params: Record<string, string>; query: Record<string, string>; body: any };
type Handler = (ctx: Ctx) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Туслах функцууд
// ---------------------------------------------------------------------------
function sb() {
  if (!supabase) throw new HttpError(500, '.env дотор VITE_SUPABASE_URL болон VITE_SUPABASE_ANON_KEY тохируулна уу.');
  return supabase;
}

function toHttp(e: PostgrestError): HttpError {
  switch (e.code) {
    case '42501': return new HttpError(403, 'Энэ үйлдлийг хийх эрх танд байхгүй байна (RLS).');
    case '23505': return new HttpError(409, 'Ийм бичлэг аль хэдийн бүртгэлтэй байна.');
    case '23503': return new HttpError(409, 'Холбоотой бичлэг байгаа тул энэ үйлдлийг хийх боломжгүй.');
    case '23514': return new HttpError(422, `Утга шалгуурт тэнцсэнгүй: ${e.message}`);
    case '23P01': return new HttpError(409, e.message); // хуваарийн давхцал (DB trigger)
    case 'PGRST116': return new HttpError(404, 'Бичлэг олдсонгүй.');
    case '42P01': return new HttpError(500, `Хүснэгт эсвэл view олдсонгүй: ${e.message}`);
    case 'PGRST200': return new HttpError(500, `Хүснэгт хоорондын холбоос (foreign key) олдсонгүй: ${e.message}`);
    default: return new HttpError(400, e.message);
  }
}

/** Supabase хариуг задлаад алдаа байвал HTTP алдаа болгоно */
async function run<T>(query: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw toHttp(error);
  return data as T;
}

/** RLS update/delete-ийг чимээгүй хаавал 0 мөр буцдаг тул шалгана */
function assertChanged<T>(rows: T[] | null, what = 'бичлэг'): T[] {
  if (!rows || rows.length === 0) throw new HttpError(403, `${what} өөрчлөх эрхгүй эсвэл олдсонгүй.`);
  return rows;
}

const clean = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v === '' ? null : v]));

const pick = (obj: Record<string, unknown>, keys: string[]) => clean(Object.fromEntries(keys.map((k) => [k, obj[k]])));

const like = (q: string) => `%${q.replace(/[,()%]/g, ' ').trim()}%`;
const avg = (n: number[]) => (n.length ? Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 100) / 100 : 0);
function attendanceRate(rows: { status: string }[]) {
  if (!rows.length) return 0;
  const ok = rows.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
  return Math.round((ok / rows.length) * 1000) / 10;
}
const semLabel = (s?: { academic_year: string; name: string } | null) => (s ? `${s.academic_year} ${s.name}` : undefined);

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
/**
 * Оюутан/ажилтны мэдээллийг v_students, v_employees view-ээс биш үндсэн хүснэгтүүдээс JOIN хийж үүсгэнэ.
 * DB дээрх view-д user_id, class_id, program_id, department_id баганууд байхгүй тул.
 */
const STUDENT_SELECT = '*, users(last_name, first_name, full_name, email, phone), classes(code), programs(name, departments(name))';
const EMPLOYEE_SELECT = '*, users(last_name, first_name, full_name, email, phone, role), departments(name)';

const mapStudent = ({ users, classes, programs, ...s }: any): StudentView => ({
  ...s,
  gpa: s.gpa !== null && s.gpa !== undefined ? Number(s.gpa) : null,
  earned_credits: Number(s.earned_credits ?? 0),
  last_name: users?.last_name ?? '',
  first_name: users?.first_name ?? '',
  full_name: users?.full_name ?? `${users?.last_name ?? ''} ${users?.first_name ?? ''}`.trim(),
  email: users?.email ?? null,
  phone: users?.phone ?? null,
  class_name: classes?.code ?? null,
  program_name: programs?.name ?? null,
  department_name: programs?.departments?.name ?? null,
});

const mapEmployee = ({ users, departments, ...e }: any): EmployeeView => ({
  ...e,
  last_name: users?.last_name ?? '',
  first_name: users?.first_name ?? '',
  full_name: users?.full_name ?? `${users?.last_name ?? ''} ${users?.first_name ?? ''}`.trim(),
  email: users?.email ?? null,
  phone: users?.phone ?? null,
  role: users?.role ?? null,
  department_name: departments?.name ?? null,
});

const getStudent = async (id: string) => mapStudent(await run(sb().from('students').select(STUDENT_SELECT).eq('id', id).single()));
const getEmployee = async (id: string) => mapEmployee(await run(sb().from('employees').select(EMPLOYEE_SELECT).eq('id', id).single()));

/** Нэр/и-мэйл нь users хүснэгтэд байдаг тул эхлээд user_id-уудыг олж, кодтой нь хамт `or` шүүлтүүр үүсгэнэ */
async function searchFilter(q: string, codeColumns: string[], role: { eq?: string; neq?: string }) {
  const pattern = like(q);
  let uq = sb().from('users').select('id').or(`full_name.ilike.${pattern},email.ilike.${pattern}`).limit(300);
  if (role.eq) uq = uq.eq('role', role.eq);
  if (role.neq) uq = uq.neq('role', role.neq);
  const users = (await run(uq)) as { id: string }[];
  const parts = codeColumns.map((c) => `${c}.ilike.${pattern}`);
  if (users.length) parts.push(`user_id.in.(${users.map((u) => u.id).join(',')})`);
  return parts.join(',');
}

async function profilesOf(userId: string): Promise<[StudentView | null, EmployeeView | null]> {
  const [student, employee] = await Promise.all([
    run(sb().from('students').select(STUDENT_SELECT).eq('user_id', userId).maybeSingle()),
    run(sb().from('employees').select(EMPLOYEE_SELECT).eq('user_id', userId).maybeSingle()),
  ]);
  return [student ? mapStudent(student) : null, employee ? mapEmployee(employee) : null];
}

let cached: { uid: string; at: number; session: Session } | null = null;

async function me(): Promise<Session> {
  const { data: auth } = await sb().auth.getUser();
  if (!auth.user) throw new HttpError(401, 'Нэвтрэх шаардлагатай.');
  if (cached && cached.uid === auth.user.id && Date.now() - cached.at < 60_000) return cached.session;

  const user = await run(sb().from('users').select('*').eq('id', auth.user.id).maybeSingle());
  if (!user) {
    throw new HttpError(403, 'Та Supabase Auth-д нэвтэрсэн ч `users` хүснэгтэд бүртгэлгүй байна. Админаар role-той мөр нэмүүлнэ үү.');
  }
  const [student, employee] = await profilesOf(auth.user.id);
  const session = { user, student: student ?? null, employee: employee ?? null } as Session;
  cached = { uid: auth.user.id, at: Date.now(), session };
  return session;
}

export function clearSupabaseSessionCache() {
  cached = null;
}

// ---------------------------------------------------------------------------
// JOIN select + mapper
// ---------------------------------------------------------------------------
const COURSE_SELECT = '*, subjects(code,name,credit,subject_type), semesters(academic_year,name), classes(code), employees(users(full_name)), enrollments(count)';
const mapCourse = (r: any): Course => ({
  ...r,
  subject_code: r.subjects?.code,
  subject_name: r.subjects?.name,
  credit: r.subjects?.credit,
  teacher_name: r.employees?.users?.full_name ?? null,
  class_name: r.classes?.code ?? null,
  semester_name: semLabel(r.semesters),
  student_count: r.enrollments?.[0]?.count ?? 0,
});

const ENROLLMENT_SELECT = '*, students(student_code, users(full_name)), courses(subjects(code,name,credit), semesters(academic_year,name), classes(code), employees(users(full_name)))';
const mapEnrollment = (r: any): Enrollment => ({
  ...r,
  scores: r.scores ?? {},
  student_code: r.students?.student_code,
  student_name: r.students?.users?.full_name,
  subject_code: r.courses?.subjects?.code,
  subject_name: r.courses?.subjects?.name,
  credit: r.courses?.subjects?.credit,
  teacher_name: r.courses?.employees?.users?.full_name ?? null,
  class_name: r.courses?.classes?.code ?? null,
  semester_name: semLabel(r.courses?.semesters),
});

const SCHEDULE_SELECT = '*, courses!inner(semester_id, class_id, teacher_id, subjects(code,name), classes(code), employees(users(full_name)))';
const mapSchedule = ({ courses, ...r }: any): Schedule => ({
  ...r,
  semester_id: courses?.semester_id,
  class_id: courses?.class_id ?? null,
  teacher_id: courses?.teacher_id ?? null,
  subject_code: courses?.subjects?.code,
  subject_name: courses?.subjects?.name,
  teacher_name: courses?.employees?.users?.full_name ?? null,
  class_name: courses?.classes?.code ?? null,
});

async function semesterSchedules(semesterId: string, day?: number) {
  let q = sb().from('schedules').select(SCHEDULE_SELECT).eq('courses.semester_id', semesterId);
  if (day) q = q.eq('day_of_week', day);
  return ((await run(q)) as any[]).map(mapSchedule);
}

async function assertScheduleFree(candidate: Omit<Schedule, 'class_id' | 'teacher_id'> | (Partial<Schedule> & { course_id: string; day_of_week: number; start_time: string; end_time: string })) {
  const course = await run(sb().from('courses').select('semester_id, class_id, teacher_id').eq('id', candidate.course_id).single()) as { semester_id: string; class_id: string | null; teacher_id: string | null };
  const entry = { id: candidate.id, course_id: candidate.course_id, day_of_week: candidate.day_of_week, start_time: candidate.start_time, end_time: candidate.end_time, room: candidate.room ?? null, building: candidate.building ?? null, class_id: course.class_id, teacher_id: course.teacher_id };
  const [first] = findConflicts(entry, await semesterSchedules(course.semester_id, candidate.day_of_week));
  if (first) throw new HttpError(409, conflictMessage(first.kind, first.with));
}

const INVOICE_SELECT = '*, students(student_code, users(full_name)), semesters(academic_year,name)';
const mapInvoice = (r: any): Invoice => ({
  ...r,
  student_code: r.students?.student_code,
  student_name: r.students?.users?.full_name,
  semester_name: semLabel(r.semesters),
});

const PAYMENT_SELECT = '*, invoices(invoice_number), students(student_code, users(full_name))';
const mapPayment = (r: any): Payment => ({
  ...r,
  invoice_number: r.invoices?.invoice_number,
  student_code: r.students?.student_code,
  student_name: r.students?.users?.full_name,
});

async function currentSemesterId(): Promise<string | undefined> {
  const row = await run(sb().from('semesters').select('id').eq('is_current', true).maybeSingle());
  return (row as { id: string } | null)?.id;
}

async function notify(userIds: string[], title: string, message: string, type: string) {
  if (!userIds.length) return;
  // Мэдэгдэл нэмэх эрхгүй бол үндсэн үйлдлийг зогсоохгүй
  await sb().from('notifications').insert(userIds.map((user_id) => ({ user_id, title, message, type, is_published: true })));
}

// Сургалтын төлбөрт net_amount generated column байж болох тул хоёр янзаар оролдоно
async function insertInvoice(row: Record<string, unknown>) {
  const first = await sb().from('invoices').insert(row).select(INVOICE_SELECT).single();
  if (first.error?.code === '428C9') {
    const { net_amount: _n, ...rest } = row;
    return run(sb().from('invoices').insert(rest).select(INVOICE_SELECT).single());
  }
  if (first.error) throw toHttp(first.error);
  return first.data;
}

const NO_BACKEND = 'Шинэ нэвтрэх эрх (Supabase Auth хэрэглэгч) үүсгэхэд service_role key шаардлагатай тул Express API эсвэл Supabase Dashboard → Authentication хэсгээс үүсгэнэ үү.';

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export const routes: Record<string, Handler> = {
  'GET /auth/me': () => me(),
  'POST /auth/lookup': async () => {
    throw new HttpError(400, 'Backend-гүй горимд зөвхөн и-мэйлээр нэвтэрнэ.');
  },

  // ----- USERS -----
  'GET /users': async ({ query }) => {
    let q = sb().from('users').select('*').order('created_at', { ascending: false }).limit(500);
    if (query.role) q = q.eq('role', query.role);
    if (query.status) q = q.eq('status', query.status);
    if (query.q) q = q.or(`full_name.ilike.${like(query.q)},email.ilike.${like(query.q)}`);
    return run(q);
  },
  'POST /users': async () => {
    throw new HttpError(501, NO_BACKEND);
  },
  'GET /users/:id': async ({ params }) => {
    const [user, [student, employee]] = await Promise.all([
      run(sb().from('users').select('*').eq('id', params.id).single()),
      profilesOf(params.id),
    ]);
    // Нэвтрэлтийн мэдээлэл (auth.users) зөвхөн service_role-оор уншигдана
    return { user, student: student ?? null, employee: employee ?? null, auth: null };
  },
  'PATCH /users/:id': async ({ params, body }) => {
    if (body.email) throw new HttpError(501, 'Нэвтрэх и-мэйл солиход Express API (VITE_DATA_SOURCE=api) шаардлагатай.');
    const changed: string[] = [];
    const base = pick(body, ['last_name', 'first_name', 'phone', 'role', 'status']);
    if (Object.keys(base).length) {
      assertChanged(await run(sb().from('users').update(base).eq('id', params.id).select('id')), 'Хэрэглэгч');
      changed.push(...Object.keys(base));
    }
    if (body.student && Object.keys(body.student).length) {
      const patch = pick(body.student, ['student_code', 'register_number', 'class_id', 'enrollment_year', 'status']);
      if (patch.class_id) patch.program_id = ((await run(sb().from('classes').select('program_id').eq('id', patch.class_id).single())) as any).program_id;
      assertChanged(await run(sb().from('students').update(patch).eq('user_id', params.id).select('id')), 'Оюутан');
      changed.push(...Object.keys(body.student).map((k) => `student.${k}`));
    }
    if (body.employee && Object.keys(body.employee).length) {
      const patch = pick(body.employee, ['employee_code', 'employee_type', 'department_id', 'position', 'specialization', 'academic_degree', 'is_active']);
      assertChanged(await run(sb().from('employees').update(patch).eq('user_id', params.id).select('id')), 'Ажилтан');
      changed.push(...Object.keys(body.employee).map((k) => `employee.${k}`));
    }
    const detail = await routes['GET /users/:id']({ params, query: {}, body: {} });
    return { ...(detail as object), changed };
  },
  'POST /users/:id/confirm-email': async () => {
    throw new HttpError(501, 'Эрх баталгаажуулахад service_role шаардлагатай. VITE_DATA_SOURCE=api горимд ажиллана.');
  },
  'POST /users/confirm-emails': async () => {
    throw new HttpError(501, 'Эрх баталгаажуулахад service_role шаардлагатай. VITE_DATA_SOURCE=api горимд ажиллана.');
  },
  'POST /users/:id/password': async () => {
    throw new HttpError(501, 'Бусад хэрэглэгчийн нууц үгийг солиход service_role шаардлагатай. VITE_DATA_SOURCE=api горимд ажиллана.');
  },

  // ----- DEPARTMENTS / PROGRAMS / SEMESTERS / CLASSES / SUBJECTS -----
  'GET /departments': async ({ query }) => {
    let q = sb().from('departments').select('*').order('name');
    if (query.level) q = q.eq('level', query.level);
    if (query.parent_id) q = q.eq('parent_id', query.parent_id);
    return run(q);
  },
  'POST /departments': ({ body }) => run(sb().from('departments').insert(pick(body, ['name', 'code', 'level', 'parent_id', 'head_name'])).select().single()),
  'PATCH /departments/:id': async ({ params, body }) => assertChanged(await run(sb().from('departments').update(clean(body)).eq('id', params.id).select()))[0],

  'GET /programs': async ({ query }) => {
    let q = sb().from('programs').select('*, departments(name)').order('name');
    if (query.department_id) q = q.eq('department_id', query.department_id);
    return (await run(q) as any[]).map((r) => ({ ...r, department_name: r.departments?.name }));
  },
  'POST /programs': ({ body }) => run(sb().from('programs').insert(pick(body, ['name', 'code', 'department_id', 'degree', 'duration_years', 'total_credits'])).select().single()),
  'PATCH /programs/:id': async ({ params, body }) =>
    assertChanged(await run(sb().from('programs').update(pick(body, ['name', 'code', 'department_id', 'degree', 'duration_years', 'total_credits'])).eq('id', params.id).select()))[0],

  'GET /semesters': () => run(sb().from('semesters').select('*').order('start_date', { ascending: false })),
  'GET /semesters/current': () => run(sb().from('semesters').select('*').eq('is_current', true).maybeSingle()),
  'POST /semesters': ({ body }) => {
    if (body.end_date <= body.start_date) throw new HttpError(422, 'Дуусах огноо эхлэх огнооноос хойш байх ёстой.');
    return run(sb().from('semesters').insert({ ...pick(body, ['academic_year', 'name', 'semester_number', 'start_date', 'end_date']), is_current: false }).select().single());
  },
  'POST /semesters/:id/set-current': async ({ params }) => {
    await run(sb().from('semesters').update({ is_current: false }).neq('id', params.id).select());
    return assertChanged(await run(sb().from('semesters').update({ is_current: true }).eq('id', params.id).select()), 'Улирал')[0];
  },

  'GET /classes': async ({ query }) => {
    let q = sb().from('classes').select('*, programs(name), employees(users(full_name)), students(count)').order('code');
    if (query.program_id) q = q.eq('program_id', query.program_id);
    return (await run(q) as any[]).map((r) => ({ ...r, program_name: r.programs?.name, advisor_name: r.employees?.users?.full_name ?? null, student_count: r.students?.[0]?.count ?? 0 }));
  },
  'POST /classes': ({ body }) => run(sb().from('classes').insert({ ...pick(body, ['code', 'program_id', 'year_level', 'advisor_id']), name: body.name || `${body.code} анги` }).select().single()),
  'PATCH /classes/:id': async ({ params, body }) => assertChanged(await run(sb().from('classes').update(pick(body, ['code', 'name', 'program_id', 'year_level', 'advisor_id'])).eq('id', params.id).select()))[0],

  'GET /subjects': async ({ query }) => {
    let q = sb().from('subjects').select('*, departments(name)').order('code');
    if (query.department_id) q = q.eq('department_id', query.department_id);
    if (query.q) q = q.or(`name.ilike.${like(query.q)},code.ilike.${like(query.q)}`);
    return (await run(q) as any[]).map((r) => ({ ...r, department_name: r.departments?.name ?? null }));
  },
  'POST /subjects': ({ body }) => run(sb().from('subjects').insert(pick(body, ['code', 'name', 'credit', 'department_id', 'program_id', 'subject_type', 'description'])).select().single()),
  'PATCH /subjects/:id': async ({ params, body }) =>
    assertChanged(await run(sb().from('subjects').update(pick(body, ['name', 'credit', 'department_id', 'subject_type', 'description'])).eq('id', params.id).select()))[0],

  // ----- STUDENTS / EMPLOYEES -----
  'GET /students': async ({ query }) => {
    let q = sb().from('students').select(STUDENT_SELECT).order('student_code').limit(2000);
    if (query.status) q = q.eq('status', query.status);
    if (query.class_id) q = q.eq('class_id', query.class_id);
    if (query.program_id) q = q.eq('program_id', query.program_id);
    if (query.q) q = q.or(await searchFilter(query.q, ['student_code', 'register_number'], { eq: 'student' }));
    return ((await run(q)) as any[]).map(mapStudent);
  },
  'GET /students/:id': async ({ params }) => {
    const [student, enrollments, invoices, attendance] = await Promise.all([
      getStudent(params.id),
      run(sb().from('enrollments').select(ENROLLMENT_SELECT).eq('student_id', params.id)),
      run(sb().from('invoices').select(INVOICE_SELECT).eq('student_id', params.id).order('created_at', { ascending: false })),
      run(sb().from('attendance').select('status').eq('student_id', params.id)),
    ]);
    return {
      student,
      enrollments: (enrollments as any[]).map(mapEnrollment),
      invoices: (invoices as any[]).map(mapInvoice),
      attendance_rate: attendanceRate(attendance as { status: string }[]),
    };
  },
  'POST /students': async () => {
    throw new HttpError(501, NO_BACKEND);
  },
  'PATCH /students/:id': async ({ params, body }) => {
    const student = await run(sb().from('students').select('user_id').eq('id', params.id).single()) as { user_id: string };
    const studentPatch = pick(body, ['register_number', 'class_id', 'enrollment_year', 'status']);
    if (body.class_id) {
      const cls = await run(sb().from('classes').select('program_id').eq('id', body.class_id).single()) as { program_id: string };
      studentPatch.program_id = cls.program_id;
    }
    assertChanged(await run(sb().from('students').update(studentPatch).eq('id', params.id).select()), 'Оюутан');
    const userPatch = pick(body, ['last_name', 'first_name', 'email', 'phone']);
    if (Object.keys(userPatch).length) await run(sb().from('users').update(userPatch).eq('id', student.user_id).select());
    return getStudent(params.id);
  },

  'GET /employees': async ({ query }) => {
    let q = sb().from('employees').select(EMPLOYEE_SELECT).order('employee_code');
    if (query.type) q = q.eq('employee_type', query.type);
    if (query.department_id) q = q.eq('department_id', query.department_id);
    if (query.q) q = q.or(await searchFilter(query.q, ['employee_code'], { neq: 'student' }));
    return ((await run(q)) as any[]).map(mapEmployee).sort((a, b) => a.full_name.localeCompare(b.full_name));
  },
  'POST /employees': async () => {
    throw new HttpError(501, NO_BACKEND);
  },
  'PATCH /employees/:id': async ({ params, body }) => {
    assertChanged(await run(sb().from('employees').update(pick(body, ['department_id', 'position', 'specialization', 'academic_degree', 'is_active'])).eq('id', params.id).select()), 'Ажилтан');
    return getEmployee(params.id);
  },

  // ----- COURSES -----
  'GET /courses': async ({ query }) => {
    let q = sb().from('courses').select(COURSE_SELECT);
    if (query.semester_id) q = q.eq('semester_id', query.semester_id);
    if (query.class_id) q = q.eq('class_id', query.class_id);
    if (query.teacher_id) q = q.eq('teacher_id', query.teacher_id);
    if (query.mine === 'true') {
      const s = await me();
      if (s.user.role === 'teacher') q = q.eq('teacher_id', s.employee?.id ?? '');
      if (s.user.role === 'student') {
        const rows = await run(sb().from('enrollments').select('course_id').eq('student_id', s.student?.id ?? '')) as { course_id: string }[];
        q = q.in('id', rows.map((r) => r.course_id));
      }
    }
    return (await run(q) as any[]).map(mapCourse);
  },
  'GET /courses/:id': async ({ params }) => mapCourse(await run(sb().from('courses').select(COURSE_SELECT).eq('id', params.id).single())),
  'POST /courses': async ({ body }) => {
    const cls = await run(sb().from('classes').select('id, code').eq('id', body.class_id).single()) as { id: string; code: string };
    const course = await run(
      sb().from('courses').insert({ ...pick(body, ['subject_id', 'semester_id', 'teacher_id', 'max_students']), class_id: cls.id, section: body.section || cls.code, status: 'planned' }).select('id').single(),
    ) as { id: string };
    await run(sb().from('grade_items').insert(
      [['Ирц', 10], ['Явцын шалгалт', 20], ['Бие даалт', 10], ['Дунд шалгалт', 20], ['Эцсийн шалгалт', 40]].map(([name, max], i) => ({ course_id: course.id, name, max_score: max, weight: max, sort_order: i + 1 })),
    ).select('id'));
    const students = await run(sb().from('students').select('id').eq('class_id', cls.id).eq('status', 'active')) as { id: string }[];
    if (students.length) {
      await run(sb().from('enrollments').insert(students.map((s) => ({ course_id: course.id, student_id: s.id, status: 'enrolled', scores: {}, grade_status: 'draft' }))).select('id'));
    }
    return mapCourse(await run(sb().from('courses').select(COURSE_SELECT).eq('id', course.id).single()));
  },
  'PATCH /courses/:id': async ({ params, body }) => {
    assertChanged(await run(sb().from('courses').update(pick(body, ['teacher_id', 'status', 'max_students'])).eq('id', params.id).select()), 'Хичээл');
    return mapCourse(await run(sb().from('courses').select(COURSE_SELECT).eq('id', params.id).single()));
  },

  // ----- GRADES -----
  'GET /courses/:id/grade-items': ({ params }) => run(sb().from('grade_items').select('*').eq('course_id', params.id).order('sort_order')),
  'GET /courses/:id/enrollments': async ({ params }) =>
    (await run(sb().from('enrollments').select(ENROLLMENT_SELECT).eq('course_id', params.id)) as any[])
      .map(mapEnrollment)
      .sort((a, b) => (a.student_name ?? '').localeCompare(b.student_name ?? '')),
  'PUT /courses/:id/grades': async ({ params, body }) => {
    const items = await run(sb().from('grade_items').select('*').eq('course_id', params.id)) as GradeItem[];
    const rows: { enrollment_id: string; scores: Record<string, number> }[] = body.rows ?? [];
    await Promise.all(rows.map(async (r) => {
      const { total, complete } = computeTotal(r.scores, items);
      const g = complete ? scoreToGrade(total) : null;
      await run(sb().from('enrollments')
        .update({ scores: r.scores, total_score: complete ? total : null, letter_grade: g?.letter ?? null, gpa_point: g?.point ?? null, grade_status: 'draft' })
        .eq('id', r.enrollment_id)
        .in('grade_status', ['draft', 'rejected'])
        .select('id'));
    }));
    return { updated: rows.length };
  },
  'POST /courses/:id/grades/submit': async ({ params }) => {
    const rows = await run(sb().from('enrollments').select('id, total_score').eq('course_id', params.id).in('grade_status', ['draft', 'rejected'])) as { id: string; total_score: number | null }[];
    const incomplete = rows.filter((r) => r.total_score === null).length;
    if (incomplete) throw new HttpError(422, `${incomplete} оюутны дүн бүрэн биш байна. Бүх бүрэлдэхүүнийг бөглөөд дахин илгээнэ үү.`);
    const updated = await run(sb().from('enrollments').update({ grade_status: 'submitted', submitted_at: new Date().toISOString() }).in('id', rows.map((r) => r.id)).select('id'));
    return { submitted: (updated as unknown[]).length };
  },
  'GET /grades/pending': async () => {
    const rows = (await run(sb().from('enrollments').select(ENROLLMENT_SELECT).eq('grade_status', 'submitted')) as any[]).map(mapEnrollment);
    const courseIds = [...new Set(rows.map((r) => r.course_id))];
    if (!courseIds.length) return [];
    const courses = (await run(sb().from('courses').select(COURSE_SELECT).in('id', courseIds)) as any[]).map(mapCourse);
    return courses.map((course) => {
      const group = rows.filter((r) => r.course_id === course.id);
      return { course, count: group.length, avg_score: avg(group.map((r) => r.total_score ?? 0)), submitted_at: group[0]?.submitted_at ?? null, rows: group };
    });
  },
  'POST /grades/approve': async ({ body }) => {
    const updated = await run(sb().from('enrollments').update({ grade_status: 'approved', approved_at: new Date().toISOString() })
      .eq('course_id', body.course_id).eq('grade_status', 'submitted').select('students(user_id), courses(subjects(name))')) as any[];
    assertChanged(updated, 'Дүн');
    await notify(updated.map((r) => r.students?.user_id).filter(Boolean), 'Шинэ дүн баталгаажлаа', `${updated[0]?.courses?.subjects?.name ?? 'Хичээл'}-ийн таны дүн баталгаажлаа.`, 'grade');
    return { approved: updated.length };
  },
  'POST /grades/reject': async ({ body }) => {
    const updated = await run(sb().from('enrollments').update({ grade_status: 'rejected' }).eq('course_id', body.course_id).eq('grade_status', 'submitted').select('id'));
    assertChanged(updated as unknown[], 'Дүн');
    const course = await run(sb().from('courses').select('employees(user_id)').eq('id', body.course_id).single()) as any;
    if (course?.employees?.user_id) await notify([course.employees.user_id], 'Дүн буцаагдлаа', body.reason || 'Сургалтын алба дүнг засварлуулахаар буцаалаа.', 'grade');
    return { rejected: (updated as unknown[]).length };
  },
  'GET /grades/me': async () => {
    const s = await me();
    return (await run(sb().from('enrollments').select(ENROLLMENT_SELECT).eq('student_id', s.student?.id ?? '')) as any[])
      .map(mapEnrollment)
      .map((e) => (e.grade_status === 'approved' ? e : { ...e, total_score: null, letter_grade: null, gpa_point: null }));
  },

  // ----- ATTENDANCE -----
  'GET /courses/:id/attendance': async ({ params, query }) => {
    let q = sb().from('attendance').select('*').eq('course_id', params.id);
    if (query.date) q = q.eq('attendance_date', query.date);
    return run(q);
  },
  'GET /courses/:id/attendance-dates': async ({ params }) => {
    const rows = await run(sb().from('attendance').select('attendance_date').eq('course_id', params.id).order('attendance_date', { ascending: false }).limit(2000)) as { attendance_date: string }[];
    return [...new Set(rows.map((r) => r.attendance_date))];
  },
  'PUT /courses/:id/attendance': async ({ params, body }) => {
    const date: string = body.date;
    const rows: { student_id: string; status: AttendanceStatus; note?: string }[] = body.rows ?? [];
    const existing = await run(sb().from('attendance').select('id, student_id').eq('course_id', params.id).eq('attendance_date', date)) as { id: string; student_id: string }[];
    const byStudent = new Map(existing.map((e) => [e.student_id, e.id]));
    const toInsert = rows.filter((r) => !byStudent.has(r.student_id)).map((r) => ({ course_id: params.id, student_id: r.student_id, attendance_date: date, status: r.status, note: r.note ?? null }));
    await Promise.all([
      toInsert.length ? run(sb().from('attendance').insert(toInsert).select('id')) : Promise.resolve(),
      ...rows.filter((r) => byStudent.has(r.student_id)).map((r) => run(sb().from('attendance').update({ status: r.status, note: r.note ?? null }).eq('id', byStudent.get(r.student_id)!).select('id'))),
    ]);
    return { saved: rows.length };
  },
  'GET /attendance/me': async () => {
    const s = await me();
    return (await run(sb().from('attendance').select('*, courses(subjects(name))').eq('student_id', s.student?.id ?? '').order('attendance_date', { ascending: false })) as any[])
      .map((a) => ({ ...a, subject_name: a.courses?.subjects?.name }));
  },

  // ----- SCHEDULES -----
  'GET /schedules': async ({ query }) => {
    const semester = query.semester_id ?? (await currentSemesterId());
    const s = await me();
    let q = sb().from('schedules').select(SCHEDULE_SELECT);
    if (semester) q = q.eq('courses.semester_id', semester);
    if (query.course_id) q = q.eq('course_id', query.course_id);
    if (query.class_id) q = q.eq('courses.class_id', query.class_id);
    // Багш ҮРГЭЛЖ зөвхөн өөрийн хичээлийн цагийг харна
    if (s.user.role === 'teacher') q = q.eq('courses.teacher_id', s.employee?.id ?? '00000000-0000-0000-0000-000000000000');
    else if (s.user.role === 'student') {
      const rows = await run(sb().from('enrollments').select('course_id').eq('student_id', s.student?.id ?? '')) as { course_id: string }[];
      q = q.in('course_id', rows.length ? rows.map((r) => r.course_id) : ['00000000-0000-0000-0000-000000000000']);
    } else if (query.teacher_id) q = q.eq('courses.teacher_id', query.teacher_id);
    let rows = ((await run(q)) as any[]).map(mapSchedule);
    if (query.room && s.user.role !== 'teacher' && s.user.role !== 'student') rows = rows.filter((r) => (r.room ?? '').toLowerCase() === query.room.toLowerCase());
    return rows.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  },
  'GET /schedules/conflicts': async ({ query }) => {
    const semester = query.semester_id ?? (await currentSemesterId());
    if (!semester) return [];
    return findAllConflicts(await semesterSchedules(semester)).map((p) => ({ kind: p.kind, a: p.a, b: p.b }));
  },
  'POST /schedules': async ({ body }) => {
    const row = {
      course_id: body.course_id, day_of_week: Number(body.day_of_week), room: body.room || null, building: body.building || null,
      start_time: `${String(body.start_time).slice(0, 5)}:00`, end_time: `${String(body.end_time).slice(0, 5)}:00`,
    };
    if (row.end_time <= row.start_time) throw new HttpError(422, 'Дуусах цаг эхлэх цагаас хойш байх ёстой.');
    await assertScheduleFree(row);
    return mapSchedule(await run(sb().from('schedules').insert(row).select(SCHEDULE_SELECT).single()));
  },
  'PATCH /schedules/:id': async ({ params, body }) => {
    const current = await run(sb().from('schedules').select('*').eq('id', params.id).single()) as any;
    const next = {
      course_id: body.course_id ?? current.course_id,
      day_of_week: body.day_of_week !== undefined ? Number(body.day_of_week) : current.day_of_week,
      start_time: body.start_time ? `${String(body.start_time).slice(0, 5)}:00` : current.start_time,
      end_time: body.end_time ? `${String(body.end_time).slice(0, 5)}:00` : current.end_time,
      room: body.room !== undefined ? body.room || null : current.room,
      building: body.building !== undefined ? body.building || null : current.building,
    };
    if (next.end_time <= next.start_time) throw new HttpError(422, 'Дуусах цаг эхлэх цагаас хойш байх ёстой.');
    await assertScheduleFree({ id: params.id, ...next });
    assertChanged(await run(sb().from('schedules').update(next).eq('id', params.id).select('id')), 'Хуваарь');
    return mapSchedule(await run(sb().from('schedules').select(SCHEDULE_SELECT).eq('id', params.id).single()));
  },
  'DELETE /schedules/:id': async ({ params }) => {
    assertChanged(await run(sb().from('schedules').delete().eq('id', params.id).select('id')), 'Хуваарь');
    return { deleted: true };
  },

  // ----- INVOICES / PAYMENTS -----
  'GET /invoices': async ({ query }) => {
    let q = sb().from('invoices').select(INVOICE_SELECT).order('created_at', { ascending: false }).limit(2000);
    if (query.status) q = q.eq('status', query.status);
    if (query.semester_id) q = q.eq('semester_id', query.semester_id);
    let rows = (await run(q) as any[]).map(mapInvoice);
    if (query.q) {
      const needle = query.q.toLowerCase();
      rows = rows.filter((i) => [i.student_name, i.student_code, i.invoice_number].some((v) => (v ?? '').toLowerCase().includes(needle)));
    }
    return rows;
  },
  'POST /invoices': async ({ body }) => {
    const tuition = Number(body.tuition_amount);
    const discount = Number(body.discount_amount) || 0;
    if (discount > tuition) throw new HttpError(422, 'Хөнгөлөлт төлбөрийн дүнгээс их байж болохгүй.');
    const semester_id = body.semester_id || (await currentSemesterId());
    const row = await insertInvoice(clean({
      student_id: body.student_id, semester_id, tuition_amount: tuition, discount_amount: discount, net_amount: tuition - discount,
      discount_note: body.discount_note, due_date: body.due_date, description: body.description,
      invoice_number: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
    }));
    return mapInvoice(row);
  },
  'PATCH /invoices/:id': async ({ params, body }) => {
    const patch = pick(body, ['discount_amount', 'discount_note', 'due_date', 'status']);
    if (patch.discount_amount !== undefined) patch.discount_amount = Number(patch.discount_amount);
    const rows = assertChanged(await run(sb().from('invoices').update(patch).eq('id', params.id).select(INVOICE_SELECT)), 'Нэхэмжлэл');
    return mapInvoice(rows[0]);
  },
  'GET /invoices/me': async () => {
    const s = await me();
    return (await run(sb().from('invoices').select(INVOICE_SELECT).eq('student_id', s.student?.id ?? '').order('created_at', { ascending: false })) as any[]).map(mapInvoice);
  },
  'GET /payments': async ({ query }) => {
    let q = sb().from('payments').select(PAYMENT_SELECT).order('payment_date', { ascending: false }).limit(2000);
    if (query.method) q = q.eq('method', query.method);
    let rows = (await run(q) as any[]).map(mapPayment);
    if (query.q) {
      const needle = query.q.toLowerCase();
      rows = rows.filter((p) => [p.student_name, p.student_code, p.invoice_number].some((v) => (v ?? '').toLowerCase().includes(needle)));
    }
    return rows;
  },
  'POST /payments': async ({ body }) => {
    const amount = Number(body.amount);
    if (amount <= 0) throw new HttpError(422, 'Төлөлтийн дүн 0-ээс их байх ёстой.');
    const inv = await run(sb().from('invoices').select('id, student_id, status, students(user_id)').eq('id', body.invoice_id).single()) as any;
    if (inv.status === 'cancelled') throw new HttpError(422, 'Цуцалсан нэхэмжлэлд төлөлт бүртгэх боломжгүй.');
    const row = await run(sb().from('payments').insert(clean({
      invoice_id: inv.id, student_id: inv.student_id, amount, method: body.method,
      transaction_reference: body.transaction_reference, description: body.description,
      payment_date: body.payment_date ? new Date(body.payment_date).toISOString() : undefined,
    })).select(PAYMENT_SELECT).single());
    if (inv.students?.user_id) await notify([inv.students.user_id], 'Төлбөр хүлээн авлаа', `${amount.toLocaleString('en-US')}₮ төлбөр амжилттай бүртгэгдлээ.`, 'finance');
    return mapPayment(row);
  },
  'GET /payments/me': async () => {
    const s = await me();
    return (await run(sb().from('payments').select(PAYMENT_SELECT).eq('student_id', s.student?.id ?? '').order('payment_date', { ascending: false })) as any[]).map(mapPayment);
  },

  // ----- NOTIFICATIONS -----
  'GET /notifications': async ({ query }) => {
    let q = sb().from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
    if (query.scope === 'announcements') q = q.is('user_id', null);
    return run(q);
  },
  'POST /notifications': async ({ body }) => {
    const s = await me();
    return run(sb().from('notifications').insert(clean({
      title: body.title, message: body.message, type: 'announcement', target_role: body.target_role,
      expire_at: body.expire_at, is_published: body.is_published ?? true, created_by: s.user.id,
    })).select().single());
  },
  'PATCH /notifications/:id': async ({ params, body }) =>
    assertChanged(await run(sb().from('notifications').update(pick(body, ['is_read', 'is_published', 'title', 'message'])).eq('id', params.id).select()), 'Мэдэгдэл')[0],
  'POST /notifications/read-all': async () => {
    const s = await me();
    await run(sb().from('notifications').update({ is_read: true }).eq('user_id', s.user.id).eq('is_read', false).select('id'));
    return { ok: true };
  },
  'DELETE /notifications/:id': async ({ params }) => {
    assertChanged(await run(sb().from('notifications').delete().eq('id', params.id).select('id')), 'Мэдэгдэл');
    return { deleted: true };
  },

  // ----- AUDIT -----
  'GET /audit-logs': async ({ query }) => {
    let q = sb().from('audit_logs').select('*, users(full_name)').order('created_at', { ascending: false }).limit(500);
    if (query.action) q = q.eq('action', query.action);
    if (query.table) q = q.eq('table_name', query.table);
    return (await run(q) as any[]).map((r) => ({ ...r, user_name: r.users?.full_name ?? null }));
  },

  // ----- REPORTS (RLS зөвшөөрсөн өгөгдлөөр frontend талд тооцоолно) -----
  'GET /reports/overview': async () => {
    const semester = await currentSemesterId();
    const count = (table: string, f?: (q: any) => any) => {
      let q: any = sb().from(table).select('id', { count: 'exact', head: true });
      if (f) q = f(q);
      return q.then((r: any) => { if (r.error) throw toHttp(r.error); return r.count ?? 0; });
    };
    const [students, teachers, schools, subjects, courses, attendance, invoices] = await Promise.all([
      run(sb().from('students').select('gpa').eq('status', 'active')),
      count('employees', (q) => q.eq('employee_type', 'teacher').eq('is_active', true)),
      count('departments', (q) => q.eq('level', 'school')),
      count('subjects'),
      count('courses', (q) => q.eq('status', 'active')),
      run(sb().from('attendance').select('status').limit(20000)),
      run(semester ? sb().from('invoices').select('net_amount, paid_amount').eq('semester_id', semester).neq('status', 'cancelled') : sb().from('invoices').select('net_amount, paid_amount').limit(0)),
    ]);
    const st = students as { gpa: number | null }[];
    const inv = invoices as { net_amount: number; paid_amount: number }[];
    const net = inv.reduce((s, i) => s + Number(i.net_amount), 0);
    const paid = inv.reduce((s, i) => s + Number(i.paid_amount), 0);
    return {
      total_students: st.length, total_teachers: teachers, total_schools: schools, total_subjects: subjects, active_courses: courses,
      avg_gpa: avg(st.map((s) => Number(s.gpa ?? 0)).filter(Boolean)),
      avg_attendance: attendanceRate(attendance as { status: string }[]),
      collection_rate: net ? Math.round((paid / net) * 1000) / 10 : 0,
    };
  },
  'GET /reports/schools': async () => structureReport('school'),
  'GET /reports/departments': async ({ query }) => structureReport('department', query.school_id),
  'GET /reports/courses/:id': async ({ params }) => {
    const [enr, att, items] = await Promise.all([
      run(sb().from('enrollments').select('scores, total_score, letter_grade').eq('course_id', params.id)),
      run(sb().from('attendance').select('status').eq('course_id', params.id)),
      run(sb().from('grade_items').select('*').eq('course_id', params.id)),
    ]);
    const rows = enr as { scores: Record<string, number> | null; total_score: number | null; letter_grade: string | null }[];
    const graded = rows.filter((e) => e.letter_grade);
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    graded.forEach((e) => { const b = letterBucket(e.letter_grade); if (b) distribution[b]++; });
    const byStatus: Record<string, number> = {};
    (att as { status: string }[]).forEach((a) => (byStatus[a.status] = (byStatus[a.status] ?? 0) + 1));
    return {
      course_id: params.id, student_count: rows.length, graded_count: graded.length,
      avg_attendance: attendanceRate(att as { status: string }[]),
      avg_score: avg(graded.length ? graded.map((e) => Number(e.total_score ?? 0)) : rows.map((e) => computeTotal(e.scores ?? {}, items as GradeItem[]).total)),
      distribution, attendance_by_status: byStatus,
    };
  },
  'GET /reports/finance': async ({ query }) => {
    const semester = query.semester_id ?? (await currentSemesterId());
    const [invoices, departments, programs] = await Promise.all([
      run(sb().from('invoices').select('id, status, tuition_amount, discount_amount, net_amount, paid_amount, students(program_id)').eq('semester_id', semester ?? '').neq('status', 'cancelled')),
      run(sb().from('departments').select('id, parent_id, level, name')),
      run(sb().from('programs').select('id, department_id')),
    ]);
    const inv = invoices as any[];
    const payments = inv.length ? await run(sb().from('payments').select('method, amount').in('invoice_id', inv.map((i) => i.id))) as { method: string; amount: number }[] : [];
    const deps = departments as { id: string; parent_id: string | null; level: string; name: string }[];
    const schoolOfProgram = (programId?: string) => {
      let d = deps.find((x) => x.id === (programs as any[]).find((p) => p.id === programId)?.department_id);
      while (d && d.level !== 'school') d = deps.find((x) => x.id === d!.parent_id);
      return d;
    };
    const by_status: Record<string, number> = {};
    const by_method: Record<string, number> = {};
    const schools = new Map<string, { name: string; billed: number; paid: number }>();
    inv.forEach((i) => {
      by_status[i.status] = (by_status[i.status] ?? 0) + 1;
      const school = schoolOfProgram(i.students?.program_id);
      if (school) {
        const row = schools.get(school.id) ?? { name: school.name, billed: 0, paid: 0 };
        row.billed += Number(i.net_amount);
        row.paid += Number(i.paid_amount);
        schools.set(school.id, row);
      }
    });
    payments.forEach((p) => (by_method[p.method] = (by_method[p.method] ?? 0) + Number(p.amount)));
    const sum = (k: string) => inv.reduce((s, i) => s + Number(i[k]), 0);
    return {
      total_billed: sum('tuition_amount'), total_discount: sum('discount_amount'), total_paid: sum('paid_amount'),
      total_outstanding: inv.reduce((s, i) => s + Math.max(0, Number(i.net_amount) - Number(i.paid_amount)), 0),
      by_status, by_method, by_school: [...schools.values()].sort((a, b) => b.billed - a.billed),
    };
  },
  'GET /reports/student-summary': async () => {
    const s = await me();
    const sid = s.student?.id ?? '';
    const semester = await currentSemesterId();
    const [enr, att, inv] = await Promise.all([
      run(sb().from('enrollments').select('grade_status, gpa_point, courses(semester_id, subjects(credit))').eq('student_id', sid)),
      run(sb().from('attendance').select('status').eq('student_id', sid)),
      run(sb().from('invoices').select('net_amount, paid_amount, status').eq('student_id', sid)),
    ]);
    const rows = enr as any[];
    return {
      gpa: s.student?.gpa ?? null,
      semester_gpa: weightedGpa(rows.filter((e) => e.grade_status === 'approved').map((e) => ({ credit: e.courses?.subjects?.credit ?? 0, gpa_point: e.gpa_point }))),
      earned_credits: s.student?.earned_credits ?? 0,
      attendance_rate: attendanceRate(att as { status: string }[]),
      balance: (inv as any[]).filter((i) => i.status !== 'cancelled').reduce((sum, i) => sum + Math.max(0, Number(i.net_amount) - Number(i.paid_amount)), 0),
      course_count: rows.filter((e) => e.courses?.semester_id === semester).length,
    };
  },
};

async function structureReport(level: 'school' | 'department', schoolId?: string) {
  const [departments, programs, students, employees, classes, subjects, attendance] = await Promise.all([
    run(sb().from('departments').select('id, parent_id, level, name')),
    run(sb().from('programs').select('id, department_id')),
    run(sb().from('students').select('id, program_id, gpa')),
    run(sb().from('employees').select('department_id, employee_type')),
    run(sb().from('classes').select('program_id')),
    run(sb().from('subjects').select('department_id')),
    run(sb().from('attendance').select('student_id, status').limit(20000)),
  ]) as any[][];
  const targets = departments.filter((d) => d.level === level && (!schoolId || d.parent_id === schoolId));
  return targets.map((t) => {
    const deptIds = new Set(level === 'school' ? departments.filter((d) => d.parent_id === t.id).map((d) => d.id) : [t.id]);
    const programIds = new Set(programs.filter((p) => deptIds.has(p.department_id)).map((p) => p.id));
    const st = students.filter((s) => programIds.has(s.program_id));
    const ids = new Set(st.map((s) => s.id));
    return {
      id: t.id, name: t.name, students: st.length,
      teachers: employees.filter((e) => e.employee_type === 'teacher' && deptIds.has(e.department_id)).length,
      classes: classes.filter((c) => programIds.has(c.program_id)).length,
      programs: programIds.size,
      subjects: subjects.filter((s) => deptIds.has(s.department_id)).length,
      avg_gpa: avg(st.map((s) => Number(s.gpa ?? 0)).filter(Boolean)),
      avg_attendance: attendanceRate(attendance.filter((a) => ids.has(a.student_id))),
    };
  });
}

// ---------------------------------------------------------------------------
// Axios adapter
// ---------------------------------------------------------------------------
const compiled = Object.entries(routes)
  .map(([key, handler]) => {
    const [method, path] = key.split(' ');
    const keys: string[] = [];
    const regex = new RegExp(`^${path.replace(/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    return { method, regex, keys, handler };
  })
  .sort((a, b) => a.keys.length - b.keys.length);

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return { data, status, statusText: String(status), headers: new AxiosHeaders(), config };
}

export const supabaseAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toUpperCase();
  const url = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  const route = compiled.find((r) => r.method === method && r.regex.test(url));

  const fail = (status: number, message: string): never => {
    throw new AxiosError(message, String(status), config, null, respond(config, status, { error: { message } }));
  };
  if (!route) return fail(404, `Route олдсонгүй: ${method} ${url}`);

  const match = url.match(route.regex)!;
  const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
  const query = Object.fromEntries(
    Object.entries((config.params ?? {}) as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );
  let body: any = config.data;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* ignore */ }
  }

  try {
    const data = await route.handler({ params, query, body: body ?? {} });
    return respond(config, method === 'POST' ? 201 : 200, { data });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.status, err.message);
    console.error(err);
    return fail(500, err instanceof Error ? err.message : 'Тодорхойгүй алдаа гарлаа.');
  }
};
