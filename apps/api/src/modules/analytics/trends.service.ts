import { supabase } from '../../config/supabase';
import { fetchAll } from '../../utils/fetch-all';

const TTL = 10 * 60_000;
let cache: { at: number; data: unknown } | null = null;

const head = async (build: () => any) => {
  const { count, error } = await build();
  if (error) throw error;
  return count ?? 0;
};

/**
 * Сүүлийн 8 улирлын хандлага (удирдлагын график).
 * Хүнд тооцоо тул 10 минут cache-лэнэ. ?fresh=true бол дахин тооцно.
 */
export async function trends(fresh = false) {
  if (!fresh && cache && Date.now() - cache.at < TTL) return cache.data;

  const semesters = (await fetchAll<any>(() => supabase.from('semesters').select('id, academic_year, name, start_date, end_date').order('start_date', { ascending: true }))).slice(-8);

  const perSemester: Record<string, unknown>[] = [];
  for (const s of semesters) {
    const [enrollments, courses, attTotal, attOk, grades, invoices] = await Promise.all([
      head(() => supabase.from('enrollments').select('id, courses!inner(semester_id)', { count: 'exact', head: true }).eq('courses.semester_id', s.id).neq('status', 'dropped')),
      head(() => supabase.from('courses').select('id', { count: 'exact', head: true }).eq('semester_id', s.id)),
      head(() => supabase.from('attendance').select('id, courses!inner(semester_id)', { count: 'exact', head: true }).eq('courses.semester_id', s.id)),
      head(() => supabase.from('attendance').select('id, courses!inner(semester_id)', { count: 'exact', head: true }).eq('courses.semester_id', s.id).in('status', ['present', 'late', 'excused'])),
      fetchAll<any>(() => supabase.from('enrollments').select('gpa_point, courses!inner(semester_id, subjects(credit))').eq('courses.semester_id', s.id).eq('grade_status', 'approved').order('id')),
      fetchAll<any>(() => supabase.from('invoices').select('net_amount, paid_amount, status').eq('semester_id', s.id).neq('status', 'cancelled').order('id')),
    ]);

    let credits = 0;
    let points = 0;
    let fails = 0;
    grades.forEach((g) => {
      const c = Number(g.courses?.subjects?.credit ?? 0);
      if (g.gpa_point === null || g.gpa_point === undefined) return;
      credits += c;
      points += c * Number(g.gpa_point);
      if (Number(g.gpa_point) === 0) fails++;
    });
    const invoiced = invoices.reduce((sum, i) => sum + Number(i.net_amount), 0);
    const collected = invoices.reduce((sum, i) => sum + Number(i.paid_amount), 0);

    perSemester.push({
      semester_id: s.id,
      label: `${s.academic_year} ${s.name}`,
      enrollments,
      courses,
      attendance_rate: attTotal ? Math.round((attOk / attTotal) * 1000) / 10 : null,
      avg_gpa: credits ? Math.round((points / credits) * 100) / 100 : null,
      graded: grades.length,
      fail_rate: grades.length ? Math.round((fails / grades.length) * 1000) / 10 : null,
      invoiced,
      collected,
      collection_rate: invoiced ? Math.round((collected / invoiced) * 1000) / 10 : null,
    });
  }

  // Элсэлт (элссэн оноор)
  const students = await fetchAll<any>(() => supabase.from('students').select('enrollment_year, status').order('id'));
  const byYear = new Map<number, { total: number; active: number; withdrawn: number }>();
  students.forEach((s) => {
    if (!s.enrollment_year) return;
    const y = byYear.get(s.enrollment_year) ?? { total: 0, active: 0, withdrawn: 0 };
    y.total++;
    if (s.status === 'active') y.active++;
    if (s.status === 'withdrawn' || s.status === 'suspended') y.withdrawn++;
    byYear.set(s.enrollment_year, y);
  });
  const intake = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-8)
    .map(([year, v]) => ({ year, ...v, retention: v.total ? Math.round(((v.total - v.withdrawn) / v.total) * 1000) / 10 : null }));

  const data = { generated_at: new Date().toISOString(), semesters: perSemester, intake };
  cache = { at: Date.now(), data };
  return data;
}
