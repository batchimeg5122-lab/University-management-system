import { supabase } from '../../config/supabase';
import { fetchAll } from '../../utils/fetch-all';
import { localDate } from '../../utils/local-date';
import { notifyMany } from '../notifications/notifications.service';
import { currentId } from '../semesters/semesters.service';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface RiskRow {
  student_id: string;
  user_id: string;
  student_code: string;
  full_name: string;
  class_id: string | null;
  class_name: string | null;
  program_name: string | null;
  advisor_id: string | null;
  gpa: number | null;
  attendance_rate: number | null;
  attendance_records: number;
  progress_pct: number | null;
  f_count: number;
  overdue_amount: number;
  overdue_days: number;
  score: number;
  level: RiskLevel;
  reasons: string[];
}

/**
 * Сурлагын эрсдэлийн оноо (0–100) — тайлбарлах боломжтой дүрэмд суурилсан загвар.
 * Хэмжүүр бүр ямар оноо нэмснийг `reasons`-оор харуулна.
 *
 *  Ирц:   <70% +35, <80% +20, <90% +8        (≥3 бүртгэлтэй үед)
 *  Явц:   <50% +25, <60% +15                  (≥20 оноо үнэлэгдсэн үед)
 *  GPA:   <2.0 +20, <2.5 +10
 *  F дүн: ≥2 +15, 1 +8
 *  Өр:    хугацаа хэтэрсэн +10, 30+ хоног +15
 *  ≥50 өндөр, ≥25 дунд
 */
export async function atRisk(semesterIdInput?: string | null) {
  const semesterId = semesterIdInput || (await currentId());
  const today = localDate();

  const [students, enrollments, gradeItems, attendance, fails, overdue] = await Promise.all([
    fetchAll<any>(() =>
      supabase.from('students').select('id, user_id, student_code, gpa, class_id, users(full_name), classes(code, advisor_id), programs(name)').eq('status', 'active').order('id'),
    ),
    semesterId
      ? fetchAll<any>(() => supabase.from('enrollments').select('student_id, course_id, scores, courses!inner(semester_id)').eq('courses.semester_id', semesterId).neq('status', 'dropped').order('id'))
      : Promise.resolve([]),
    semesterId
      ? fetchAll<any>(() => supabase.from('grade_items').select('id, course_id, max_score, courses!inner(semester_id)').eq('courses.semester_id', semesterId).order('id'))
      : Promise.resolve([]),
    semesterId
      ? fetchAll<any>(() => supabase.from('attendance').select('student_id, status, courses!inner(semester_id)').eq('courses.semester_id', semesterId).order('id'))
      : Promise.resolve([]),
    fetchAll<any>(() => supabase.from('enrollments').select('student_id').eq('grade_status', 'approved').like('letter_grade', 'F%').order('id')),
    fetchAll<any>(() => supabase.from('invoices').select('student_id, net_amount, paid_amount, due_date').eq('status', 'overdue').order('id')),
  ]);

  // Хичээл бүрийн үнэлгээний бүрэлдэхүүн (дээд оноо)
  const itemsByCourse = new Map<string, Map<string, number>>();
  gradeItems.forEach((g) => {
    if (!itemsByCourse.has(g.course_id)) itemsByCourse.set(g.course_id, new Map());
    itemsByCourse.get(g.course_id)!.set(g.id, Number(g.max_score));
  });

  const progress = new Map<string, { earned: number; max: number }>();
  enrollments.forEach((e) => {
    const items = itemsByCourse.get(e.course_id);
    if (!items || !e.scores) return;
    const p = progress.get(e.student_id) ?? { earned: 0, max: 0 };
    for (const [itemId, score] of Object.entries(e.scores as Record<string, number>)) {
      const max = items.get(itemId);
      if (max === undefined || score === null || score === undefined) continue;
      p.earned += Math.min(Number(score), max);
      p.max += max;
    }
    progress.set(e.student_id, p);
  });

  const att = new Map<string, { ok: number; total: number }>();
  attendance.forEach((a) => {
    const r = att.get(a.student_id) ?? { ok: 0, total: 0 };
    r.total++;
    if (a.status === 'present' || a.status === 'late' || a.status === 'excused') r.ok++;
    att.set(a.student_id, r);
  });

  const fCount = new Map<string, number>();
  fails.forEach((f) => fCount.set(f.student_id, (fCount.get(f.student_id) ?? 0) + 1));

  const debt = new Map<string, { amount: number; days: number }>();
  overdue.forEach((i) => {
    const bal = Math.max(0, Number(i.net_amount) - Number(i.paid_amount));
    if (bal <= 0) return;
    const days = i.due_date ? Math.round((Date.parse(today) - Date.parse(i.due_date)) / 86_400_000) : 0;
    const d = debt.get(i.student_id) ?? { amount: 0, days: 0 };
    debt.set(i.student_id, { amount: d.amount + bal, days: Math.max(d.days, days) });
  });

  const rows: RiskRow[] = students.map((s) => {
    const reasons: string[] = [];
    let score = 0;
    const a = att.get(s.id);
    const rate = a && a.total ? Math.round((a.ok / a.total) * 1000) / 10 : null;
    if (a && a.total >= 3 && rate !== null) {
      if (rate < 70) (score += 35), reasons.push(`Ирц ${rate}% (<70%)`);
      else if (rate < 80) (score += 20), reasons.push(`Ирц ${rate}% (<80%)`);
      else if (rate < 90) (score += 8), reasons.push(`Ирц ${rate}%`);
    }
    const p = progress.get(s.id);
    const pct = p && p.max ? Math.round((p.earned / p.max) * 1000) / 10 : null;
    if (p && p.max >= 20 && pct !== null) {
      if (pct < 50) (score += 25), reasons.push(`Явцын оноо ${pct}% (<50%)`);
      else if (pct < 60) (score += 15), reasons.push(`Явцын оноо ${pct}% (<60%)`);
    }
    const gpa = s.gpa === null || s.gpa === undefined ? null : Number(s.gpa);
    if (gpa !== null) {
      if (gpa < 2) (score += 20), reasons.push(`GPA ${gpa.toFixed(2)} (<2.0)`);
      else if (gpa < 2.5) (score += 10), reasons.push(`GPA ${gpa.toFixed(2)} (<2.5)`);
    }
    const f = fCount.get(s.id) ?? 0;
    if (f >= 2) (score += 15), reasons.push(`${f} хичээлд F`);
    else if (f === 1) (score += 8), reasons.push('1 хичээлд F');
    const d = debt.get(s.id);
    if (d) {
      if (d.days > 30) (score += 15), reasons.push(`Төлбөр ${d.days} хоног хэтэрсэн`);
      else (score += 10), reasons.push('Төлбөрийн хугацаа хэтэрсэн');
    }
    score = Math.min(100, score);
    return {
      student_id: s.id,
      user_id: s.user_id,
      student_code: s.student_code,
      full_name: s.users?.full_name ?? '',
      class_id: s.class_id ?? null,
      class_name: s.classes?.code ?? null,
      program_name: s.programs?.name ?? null,
      advisor_id: s.classes?.advisor_id ?? null,
      gpa,
      attendance_rate: rate,
      attendance_records: a?.total ?? 0,
      progress_pct: pct,
      f_count: f,
      overdue_amount: d?.amount ?? 0,
      overdue_days: d?.days ?? 0,
      score,
      level: score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low',
      reasons,
    };
  });

  rows.sort((x, y) => y.score - x.score);
  return {
    semester_id: semesterId,
    generated_at: new Date().toISOString(),
    summary: {
      students: rows.length,
      high: rows.filter((r) => r.level === 'high').length,
      medium: rows.filter((r) => r.level === 'medium').length,
      low: rows.filter((r) => r.level === 'low').length,
    },
    rows: rows.filter((r) => r.level !== 'low'),
  };
}

/** Сонгосон оюутнуудын ангийн зөвлөх багш нарт мэдэгдэнэ (зөвлөх тус бүрт нэг мэдэгдэл) */
export async function notifyAdvisors(studentIds: string[], actorId: string) {
  const report = await atRisk();
  const chosen = report.rows.filter((r) => studentIds.includes(r.student_id) && r.advisor_id);
  const byAdvisor = new Map<string, typeof chosen>();
  chosen.forEach((r) => byAdvisor.set(r.advisor_id!, [...(byAdvisor.get(r.advisor_id!) ?? []), r]));
  if (!byAdvisor.size) return { advisors: 0, students: 0, without_advisor: studentIds.length };

  const { data: emps } = await supabase.from('employees').select('id, user_id').in('id', [...byAdvisor.keys()]);
  const userOf = new Map((emps ?? []).map((e: any) => [e.id, e.user_id]));
  const items = [...byAdvisor.entries()].map(([advisorId, list]) => ({
    userId: userOf.get(advisorId) as string,
    title: `Анхаарах оюутан: ${list.length}`,
    message: list
      .slice(0, 8)
      .map((r) => `${r.full_name} (${r.class_name ?? ''}) — ${r.reasons.slice(0, 2).join(', ')}`)
      .join('\n') + (list.length > 8 ? `\n… +${list.length - 8}` : ''),
  }));
  await notifyMany(items, 'general', actorId);
  return { advisors: items.length, students: chosen.length, without_advisor: studentIds.length - chosen.length };
}
