import { supabase } from '../../config/supabase';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { attendanceRate, avg, computeTotal, letterBucket, weightedGpa } from '../../utils/gpa';
import { currentId } from '../semesters/semesters.service';

/** Их хэмжээний хүснэгтийг 1000 мөрөөр хуудаслан бүгдийг татна */
async function fetchAll<T>(table: string, columns: string, apply?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q: any = supabase.from(table).select(columns).range(from, from + size - 1);
    if (apply) q = apply(q);
    const rows = await run<T[]>(q);
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

async function count(table: string, apply?: (q: any) => any) {
  let q: any = supabase.from(table).select('id', { count: 'exact', head: true });
  if (apply) q = apply(q);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

export async function overview() {
  const semester = await currentId();
  const [students, teachers, schools, subjects, activeCourses, attendance, invoices] = await Promise.all([
    fetchAll<{ gpa: number | null }>('students', 'gpa', (q) => q.eq('status', 'active')),
    count('employees', (q) => q.eq('employee_type', 'teacher').eq('is_active', true)),
    count('departments', (q) => q.eq('level', 'school')),
    count('subjects'),
    count('courses', (q) => q.eq('status', 'active')),
    fetchAll<{ status: string }>('attendance', 'status'),
    semester ? fetchAll<{ net_amount: number; paid_amount: number }>('invoices', 'net_amount, paid_amount', (q) => q.eq('semester_id', semester).neq('status', 'cancelled')) : Promise.resolve([]),
  ]);
  const net = invoices.reduce((s, i) => s + Number(i.net_amount), 0);
  const paid = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);
  return {
    total_students: students.length,
    total_teachers: teachers,
    total_schools: schools,
    total_subjects: subjects,
    active_courses: activeCourses,
    avg_gpa: avg(students.map((s) => Number(s.gpa ?? 0)).filter(Boolean)),
    avg_attendance: attendanceRate(attendance),
    collection_rate: net ? Math.round((paid / net) * 1000) / 10 : 0,
  };
}

async function structure(level: 'school' | 'department', schoolId?: string) {
  const [departments, programs, students, employees, classes, subjects, attendance] = await Promise.all([
    fetchAll<any>('departments', 'id, parent_id, level, name'),
    fetchAll<any>('programs', 'id, department_id'),
    fetchAll<any>('students', 'id, program_id, gpa'),
    fetchAll<any>('employees', 'department_id, employee_type'),
    fetchAll<any>('classes', 'program_id'),
    fetchAll<any>('subjects', 'department_id'),
    fetchAll<any>('attendance', 'student_id, status'),
  ]);

  return departments
    .filter((d) => d.level === level && (!schoolId || d.parent_id === schoolId))
    .map((t) => {
      const deptIds = new Set(level === 'school' ? departments.filter((d) => d.parent_id === t.id).map((d) => d.id) : [t.id]);
      const programIds = new Set(programs.filter((p) => deptIds.has(p.department_id)).map((p) => p.id));
      const st = students.filter((s) => programIds.has(s.program_id));
      const ids = new Set(st.map((s) => s.id));
      return {
        id: t.id,
        name: t.name,
        students: st.length,
        teachers: employees.filter((e) => e.employee_type === 'teacher' && deptIds.has(e.department_id)).length,
        classes: classes.filter((c) => programIds.has(c.program_id)).length,
        programs: programIds.size,
        subjects: subjects.filter((s) => deptIds.has(s.department_id)).length,
        avg_gpa: avg(st.map((s) => Number(s.gpa ?? 0)).filter(Boolean)),
        avg_attendance: attendanceRate(attendance.filter((a) => ids.has(a.student_id))),
      };
    });
}

export const schools = () => structure('school');
export const departments = (schoolId?: string) => structure('department', schoolId || undefined);

export async function course(courseId: string) {
  const [enrollments, attendance, items] = await Promise.all([
    run(supabase.from('enrollments').select('scores, total_score, letter_grade').eq('course_id', courseId)),
    fetchAll<{ status: string }>('attendance', 'status', (q) => q.eq('course_id', courseId)),
    run(supabase.from('grade_items').select('id, max_score').eq('course_id', courseId)),
  ]);
  const graded = enrollments.filter((e) => e.letter_grade);
  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  graded.forEach((e) => {
    const b = letterBucket(e.letter_grade);
    if (b) distribution[b]++;
  });
  const byStatus: Record<string, number> = {};
  attendance.forEach((a) => (byStatus[a.status] = (byStatus[a.status] ?? 0) + 1));

  return {
    course_id: courseId,
    student_count: enrollments.length,
    graded_count: graded.length,
    avg_attendance: attendanceRate(attendance),
    avg_score: avg(graded.length ? graded.map((e) => Number(e.total_score ?? 0)) : enrollments.map((e) => computeTotal(e.scores ?? {}, items).total)),
    distribution,
    attendance_by_status: byStatus,
  };
}

export async function finance(semesterId?: string) {
  const semester = semesterId || (await currentId());
  if (!semester) return { total_billed: 0, total_discount: 0, total_paid: 0, total_outstanding: 0, by_status: {}, by_method: {}, by_school: [] };

  const [invoices, departmentsRows, programs] = await Promise.all([
    fetchAll<any>('invoices', 'id, status, tuition_amount, discount_amount, net_amount, paid_amount, students(program_id)', (q) => q.eq('semester_id', semester).neq('status', 'cancelled')),
    fetchAll<any>('departments', 'id, parent_id, level, name'),
    fetchAll<any>('programs', 'id, department_id'),
  ]);
  const invoiceIds = invoices.map((i) => i.id);
  const payments: { method: string; amount: number }[] = [];
  for (let i = 0; i < invoiceIds.length; i += 300) {
    payments.push(...(await run(supabase.from('payments').select('method, amount').in('invoice_id', invoiceIds.slice(i, i + 300)))));
  }

  const programDept = new Map(programs.map((p) => [p.id, p.department_id]));
  const deptById = new Map(departmentsRows.map((d) => [d.id, d]));
  const schoolOf = (programId?: string) => {
    let d = deptById.get(programDept.get(programId ?? ''));
    while (d && d.level !== 'school') d = deptById.get(d.parent_id);
    return d;
  };

  const by_status: Record<string, number> = {};
  const by_method: Record<string, number> = {};
  const bySchool = new Map<string, { name: string; billed: number; paid: number }>();

  invoices.forEach((i) => {
    by_status[i.status] = (by_status[i.status] ?? 0) + 1;
    const school = schoolOf(i.students?.program_id);
    if (!school) return;
    const row = bySchool.get(school.id) ?? { name: school.name, billed: 0, paid: 0 };
    row.billed += Number(i.net_amount);
    row.paid += Number(i.paid_amount);
    bySchool.set(school.id, row);
  });
  payments.forEach((p) => (by_method[p.method] = (by_method[p.method] ?? 0) + Number(p.amount)));

  const sum = (k: string) => invoices.reduce((s, i) => s + Number(i[k]), 0);
  return {
    total_billed: sum('tuition_amount'),
    total_discount: sum('discount_amount'),
    total_paid: sum('paid_amount'),
    total_outstanding: invoices.reduce((s, i) => s + Math.max(0, Number(i.net_amount) - Number(i.paid_amount)), 0),
    by_status,
    by_method,
    by_school: [...bySchool.values()].sort((a, b) => b.billed - a.billed),
  };
}

export async function studentSummary(actor: AuthUser) {
  const sid = actor.studentId ?? '';
  const semester = await currentId();
  const [student, enrollments, attendance, invoices] = await Promise.all([
    run(supabase.from('students').select('gpa, earned_credits').eq('id', sid).single()),
    run(supabase.from('enrollments').select('grade_status, gpa_point, courses(semester_id, subjects(credit))').eq('student_id', sid)),
    run(supabase.from('attendance').select('status').eq('student_id', sid)),
    run(supabase.from('invoices').select('net_amount, paid_amount, status').eq('student_id', sid)),
  ]);
  const rows = enrollments as any[];
  return {
    gpa: student.gpa !== null ? Number(student.gpa) : null,
    semester_gpa: weightedGpa(rows.filter((e) => e.grade_status === 'approved').map((e) => ({ credit: Number(e.courses?.subjects?.credit ?? 0), gpa_point: e.gpa_point }))),
    earned_credits: Number(student.earned_credits ?? 0),
    attendance_rate: attendanceRate(attendance),
    balance: invoices.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + Math.max(0, Number(i.net_amount) - Number(i.paid_amount)), 0),
    course_count: rows.filter((e) => e.courses?.semester_id === semester).length,
  };
}
