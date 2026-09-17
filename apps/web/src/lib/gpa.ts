import { GRADE_SCALE } from './constants';
import type { GradeItem } from '@/types/models';

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
  const valid = rows.filter((r) => r.gpa_point !== null);
  const credits = valid.reduce((s, r) => s + r.credit, 0);
  if (!credits) return null;
  const points = valid.reduce((s, r) => s + r.credit * (r.gpa_point ?? 0), 0);
  return Math.round((points / credits) * 100) / 100;
}

export function letterBucket(letter: string | null): 'A' | 'B' | 'C' | 'D' | 'F' | null {
  if (!letter) return null;
  const c = letter.charAt(0) as 'A' | 'B' | 'C' | 'D' | 'F';
  return ['A', 'B', 'C', 'D', 'F'].includes(c) ? c : null;
}
