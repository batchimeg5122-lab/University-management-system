import { describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fake-supabase';

vi.mock('../src/config/supabase', () => ({
  supabase: fakeSupabase({
    students: [
      { id: 's1', student_code: 'ST26SE001', users: { full_name: 'Батын Дорж' } },
      { id: 's2', student_code: 'ST26SE002', users: { full_name: 'Сарын Номин' } },
      { id: 's3', student_code: 'ST-2026-003', users: { full_name: 'Болдын Бат' } },
    ],
    invoices: [
      { id: 'i1', invoice_number: 'INV-2026-00001', student_id: 's1', net_amount: 4_500_000, paid_amount: 0, due_date: '2026-10-01' },
      { id: 'i2', invoice_number: 'INV-2026-00002', student_id: 's2', net_amount: 1_000_000, paid_amount: 800_000, due_date: '2026-10-01' },
      { id: 'i3', invoice_number: 'INV-2026-00003', student_id: 's3', net_amount: 500_000, paid_amount: 0, due_date: '2026-10-01' },
    ],
    payments: [{ transaction_reference: 'OLD1' }],
  }),
}));

const { preview, parseDate } = await import('../src/modules/payments/payments.reconcile');

describe('parseDate', () => {
  it.each([
    ['2026.09.21', '2026-09-21'],
    ['21/09/2026', '2026-09-21'],
    ['2026-09-21 14:03', '2026-09-21'],
    ['46286', '2026-09-21'],
  ])('%s', (input, expected) => expect(parseDate(input)?.slice(0, 10)).toBe(expected));
  it('буруу утга', () => expect(parseDate('junk')).toBeNull());
});

describe('банкны хуулга тулгах', async () => {
  const r = await preview({
    rows: [
      { row: 2, date: '2026.09.21', amount: 1_000_000, description: 'st26se001 төлбөр', reference: 'T1' },
      { row: 3, date: '2026.09.21', amount: 3_600_000, description: 'ST26SE001 үлдэгдэл', reference: 'T2' },
      { row: 4, date: '2026.09.21', amount: 200_000, description: 'INV-2026-00002', reference: 'T3' },
      { row: 5, date: '2026.09.21', amount: 50_000, description: 'ST26SE001 ST26SE002', reference: 'T4' },
      { row: 6, date: '2026.09.21', amount: 100_000, description: 'хоол', reference: 'T5' },
      { row: 7, date: '2026.09.21', amount: -5_000, description: 'шимтгэл', reference: 'T6' },
      { row: 8, date: '2026.09.21', amount: 100_000, description: 'ST26SE002', reference: 'OLD1' },
      { row: 9, date: '2026.09.21', amount: 500_000, description: 'ST-2026-003 Бат', reference: 'T8' },
    ],
  } as never);
  const status = (row: number) => r.rows.find((x: any) => x.row === row)?.status;

  it('оюутны кодоор (жижиг үсгээр ч)', () => expect(status(2)).toBe('matched'));
  it('үлдэгдлээс илүү', () => expect(status(3)).toBe('overpaid'));
  it('нэхэмжлэлийн дугаараар', () => expect(status(4)).toBe('matched'));
  it('хоёр код — тодорхойгүй', () => expect(status(5)).toBe('ambiguous'));
  it('код алга', () => expect(status(6)).toBe('unmatched'));
  it('зарлагыг алгасна', () => expect(status(7)).toBe('skip'));
  it('давхардсан гүйлгээ', () => expect(status(8)).toBe('duplicate'));
  it('зураастай код', () => expect(status(9)).toBe('matched'));
  it('дүгнэлт', () => expect(r.summary).toMatchObject({ total: 8, matched: 3, overpaid: 1, duplicate: 1, skipped: 1 }));
});
