import { GRADE_SCALE } from './constants';
import type { Enrollment, GradeItem } from '../types/models';

export function scoreToGrade(total: number) {
  const row = GRADE_SCALE.find((r) => total >= r.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { letter: row.letter, point: row.point };
}

export function computeTotal(scores: Record<string, number>, items: GradeItem[]) {
  let sum = 0;
  let filled = 0;
  for (const item of items) {
    const v = scores[item.id];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      sum += Math.min(v, item.max_score);
      filled++;
    }
  }
  return { total: Math.round(sum * 100) / 100, complete: filled === items.length && items.length > 0 };
}

export function weightedGpa(rows: { credit: number; gpa_point: number | null }[]) {
  const valid = rows.filter((r) => r.gpa_point !== null && r.gpa_point !== undefined);
  const credits = valid.reduce((s, r) => s + r.credit, 0);
  if (!credits) return null;
  const points = valid.reduce((s, r) => s + r.credit * (r.gpa_point ?? 0), 0);
  return Math.round((points / credits) * 100) / 100;
}

export interface SemesterGpa {
  semester: string;
  gpa: number | null;
  credits: number;
  courses: number;
}

/** Баталгаажсан дүнгээр улирал тус бүрийн GPA */
export function semesterBreakdown(grades: Enrollment[]): SemesterGpa[] {
  const approved = grades.filter((g) => g.grade_status === 'approved' && g.gpa_point !== null);
  const map = new Map<string, Enrollment[]>();
  approved.forEach((g) => {
    const key = g.semester_name ?? 'Тодорхойгүй';
    map.set(key, [...(map.get(key) ?? []), g]);
  });
  return [...map.entries()]
    .map(([semester, rows]) => ({
      semester,
      gpa: weightedGpa(rows.map((r) => ({ credit: Number(r.credit ?? 0), gpa_point: r.gpa_point }))),
      credits: rows.reduce((s, r) => s + Number(r.credit ?? 0), 0),
      courses: rows.length,
    }))
    .sort((a, b) => b.semester.localeCompare(a.semester));
}

export function letterBucket(letter: string | null): 'A' | 'B' | 'C' | 'D' | 'F' | null {
  if (!letter) return null;
  const c = letter.charAt(0) as 'A' | 'B' | 'C' | 'D' | 'F';
  return ['A', 'B', 'C', 'D', 'F'].includes(c) ? c : null;
}

/** Ирцийн хувь: ирсэн + хоцорсон + чөлөөтэй (API-тай ижил томьёо) */
export function attendanceRate(rows: { status: string }[]) {
  if (!rows.length) return 0;
  const okCount = rows.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
  return Math.round((okCount / rows.length) * 1000) / 10;
}
