export interface GradeItemLike {
  id: string;
  max_score: number;
}

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

export function scoreToGrade(total: number) {
  const row = GRADE_SCALE.find((r) => total >= r.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { letter: row.letter, point: row.point };
}

export function computeTotal(scores: Record<string, number>, items: GradeItemLike[]) {
  let sum = 0;
  let filled = 0;
  for (const item of items) {
    const v = scores[item.id];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      sum += Math.min(Math.max(0, v), Number(item.max_score));
      filled++;
    }
  }
  return { total: Math.round(sum * 100) / 100, complete: items.length > 0 && filled === items.length };
}

export function weightedGpa(rows: { credit: number; gpa_point: number | null }[]) {
  const valid = rows.filter((r) => r.gpa_point !== null);
  const credits = valid.reduce((s, r) => s + r.credit, 0);
  if (!credits) return null;
  return Math.round((valid.reduce((s, r) => s + r.credit * Number(r.gpa_point), 0) / credits) * 100) / 100;
}

export function letterBucket(letter: string | null): 'A' | 'B' | 'C' | 'D' | 'F' | null {
  const c = letter?.charAt(0);
  return c && ['A', 'B', 'C', 'D', 'F'].includes(c) ? (c as 'A') : null;
}

/** Хоцорсон, чөлөөтэйг ирсэнд тооцно */
export function attendanceRate(rows: { status: string }[]) {
  if (!rows.length) return 0;
  const ok = rows.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
  return Math.round((ok / rows.length) * 1000) / 10;
}

export const avg = (n: number[]) => (n.length ? Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 100) / 100 : 0);
