import { describe, expect, it } from 'vitest';
import { localDate, localWeekday } from '../src/utils/local-date';

describe('Монголын цагийн бүс', () => {
  it('UTC 20:00 = УБ дараагийн өдөр 04:00', () => {
    const d = new Date('2026-09-21T20:00:00Z'); // Даваа UTC → Мягмар УБ
    expect(localDate(d)).toBe('2026-09-22');
    expect(localWeekday(d)).toBe(2);
  });
  it('Ням = 7', () => expect(localWeekday(new Date('2026-09-27T04:00:00Z'))).toBe(7));
});
