import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fake-supabase';

vi.mock('../src/config/supabase', () => ({ supabase: fakeSupabase({}) }));
const { verify, extractToken } = await import('../src/modules/student-card/student-card.service');

const SECRET = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update('ikhzasag-student-card-v1').digest('hex');
const id = '3f2b8c1a12344abc9def0123456789ab';
const token = (exp: number) => `${id}.${exp.toString(36)}.${createHmac('sha256', SECRET).update(`${id}.${exp}`).digest('base64url').slice(0, 24)}`;

describe('цахим үнэмлэхийн QR token', () => {
  it('формат буруу', async () => expect((await verify('abc')).reason).toBe('invalid'));
  it('гарын үсэг өөрчилсөн', async () => {
    const t = token(Math.floor(Date.now() / 1000) + 600);
    expect((await verify(`${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`)).reason).toBe('invalid');
  });
  it('хугацаа дууссан бол хувийн мэдээлэл өгөхгүй', async () => {
    const r = await verify(token(Math.floor(Date.now() / 1000) - 5));
    expect(r.reason).toBe('expired_qr');
    expect(r.card).toBeNull();
  });
  it('URL-аас token салгана', () => {
    const t = token(123);
    expect(extractToken(`http://192.168.1.5:5173/id/${t}?x=1`)).toBe(t);
    expect(extractToken(t)).toBe(t);
  });
});
