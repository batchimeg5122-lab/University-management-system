import { describe, expect, it } from 'vitest';
import { addDays, localDate, localWeekday, weekdayOf } from '../src/utils/local-date';

describe('Монголын цагийн бүс', () => {
  it('UTC 20:00 = УБ дараагийн өдөр 04:00', () => {
    const d = new Date('2026-09-21T20:00:00Z'); // Даваа UTC → Мягмар УБ
    expect(localDate(d)).toBe('2026-09-22');
    expect(localWeekday(d)).toBe(2);
  });
  it('Ням = 7', () => expect(localWeekday(new Date('2026-09-27T04:00:00Z'))).toBe(7));
});

describe('Хичээл цуцлах — огнооны тооцоо', () => {
  it('weekdayOf: 2026-09-28 = Даваа (1)', () => expect(weekdayOf('2026-09-28')).toBe(1));
  it('weekdayOf: 2026-09-27 = Ням (7)', () => expect(weekdayOf('2026-09-27')).toBe(7));
  it('addDays: сарын хил дамжина', () => expect(addDays('2026-09-28', 5)).toBe('2026-10-03'));
  it('addDays: сөрөг', () => expect(addDays('2026-10-01', -1)).toBe('2026-09-30'));
  it('цуцлах огноо нь хуваарийн гарагтай таарна', () => {
    // Мягмар (2)-ын хуваарийг зөвхөн Мягмар өдрүүдэд цуцална
    expect(weekdayOf('2026-09-29')).toBe(2);
    expect(weekdayOf('2026-09-30')).not.toBe(2);
  });
});
