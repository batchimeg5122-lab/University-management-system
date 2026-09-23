import { describe, expect, it } from 'vitest';
import { applyRules, type DiscountRule } from '../src/modules/discount-rules/discount-rules.service';

const rule = (r: Partial<DiscountRule>): DiscountRule => ({ id: Math.random().toString(), name: 'R', kind: 'gpa', percent: null, amount: null, params: {}, stackable: false, is_active: true, note: null, ...r });
const T = 4_500_000;

describe('applyRules', () => {
  const rules = [
    rule({ name: 'Онц', kind: 'gpa', percent: 20, params: { min_gpa: 3.5 } }),
    rule({ name: 'Тамирчин', kind: 'students', percent: 30, params: { student_codes: ['ST001'] } }),
    rule({ name: '1-р курс', kind: 'year_level', amount: 100_000, params: { year_levels: [1] }, stackable: true }),
  ];

  it('тохирох дүрэмгүй', () => expect(applyRules(rules, { student_code: 'X', program_id: null, year_level: 3, gpa: 2 }, T).amount).toBe(0));
  it('хуримтлагдахгүйгээс хамгийн их нь', () => {
    const r = applyRules(rules, { student_code: 'ST001', program_id: null, year_level: 2, gpa: 3.9 }, T);
    expect(r.amount).toBe(1_350_000);
    expect(r.note).toContain('Тамирчин');
    expect(r.note).not.toContain('Онц');
  });
  it('хуримтлагдах дүрэм нэмэгдэнэ', () => expect(applyRules(rules, { student_code: 'Y', program_id: null, year_level: 1, gpa: 3.6 }, T).amount).toBe(1_000_000));
  it('төлбөрөөс хэтрэхгүй', () => {
    const r = applyRules([rule({ kind: 'program', percent: 100, params: { program_ids: ['p'] }, stackable: true }), ...rules], { student_code: 'ST001', program_id: 'p', year_level: 1, gpa: 4 }, T);
    expect(r.amount).toBe(T);
  });
});
