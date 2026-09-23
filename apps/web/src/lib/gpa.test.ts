import { describe, expect, it } from 'vitest';
import { scoreToGrade } from './gpa';

describe('scoreToGrade (web)', () => {
  it('анхдагч шкал', () => {
    expect(scoreToGrade(96).letter).toBe('A');
    expect(scoreToGrade(59).letter).toBe('F');
  });
  it('тохиргооны шкал', () => {
    const scale = [{ min: 0, letter: 'F', point: 0 }, { min: 50, letter: 'P', point: 2 }];
    expect(scoreToGrade(55, scale).letter).toBe('P');
  });
});
