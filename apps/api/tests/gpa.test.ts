import { describe, expect, it } from 'vitest';
import { computeTotal, GRADE_SCALE, scoreToGrade } from '../src/utils/gpa';

describe('scoreToGrade', () => {
  it('анхдагч шкалаар', () => {
    expect(scoreToGrade(96)).toEqual({ letter: 'A', point: 4 });
    expect(scoreToGrade(95.9)).toEqual({ letter: 'A-', point: 3.7 });
    expect(scoreToGrade(60)).toEqual({ letter: 'D-', point: 0.7 });
    expect(scoreToGrade(59.99)).toEqual({ letter: 'F', point: 0 });
    expect(scoreToGrade(0).letter).toBe('F');
  });

  it('тохиргооноос ирсэн шкал (эрэмбэгүй ч зөв)', () => {
    const scale = [
      { min: 0, letter: 'F', point: 0 },
      { min: 90, letter: 'A', point: 4 },
      { min: 70, letter: 'B', point: 3 },
    ];
    expect(scoreToGrade(92, scale).letter).toBe('A');
    expect(scoreToGrade(75, scale).letter).toBe('B');
    expect(scoreToGrade(10, scale).letter).toBe('F');
  });

  it('анхдагч шкал 0-ээс эхэлдэг', () => {
    expect(GRADE_SCALE.some((r) => r.min === 0)).toBe(true);
  });
});

describe('computeTotal', () => {
  const items = [
    { id: 'a', max_score: 20 },
    { id: 'b', max_score: 30 },
  ];
  it('бүрэн бөглөсөн', () => expect(computeTotal({ a: 18, b: 25 }, items)).toEqual({ total: 43, complete: true }));
  it('дутуу', () => expect(computeTotal({ a: 18 }, items).complete).toBe(false));
  it('дээд оноогоор хязгаарлана', () => expect(computeTotal({ a: 99, b: 30 }, items).total).toBe(50));
});
