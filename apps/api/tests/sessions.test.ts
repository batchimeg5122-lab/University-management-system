import { describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fake-supabase';

const store: any[] = [{ user_id: 'u1', platform: 'web', session_id: 'S-WEB-1' }];
vi.mock('../src/config/supabase', () => ({
  supabase: {
    from: (t: string) => {
      const b = fakeSupabase({ active_sessions: store, system_settings: [{ key: 'security', value: { require_staff_mfa: false, single_session: true, single_session_roles: ['student'] } }] }).from(t);
      return { ...b, upsert: (row: any) => { store.length = 0; store.push(row); return Promise.resolve({ error: null }); } };
    },
  },
}));

const { tokenClaims } = await import('../src/middleware/auth.middleware');
const { isCurrent, platformOf, enforcedFor, clearSessionCache } = await import('../src/modules/auth/sessions.service');

const jwt = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`;
const user = (sessionId: string) => ({ id: 'u1', role: 'student', fullName: '', email: null, studentId: null, employeeId: null, sessionId }) as never;

describe('JWT claims', () => {
  it('aal ба session_id-г уншина', () => expect(tokenClaims(jwt({ aal: 'aal2', session_id: 'abc' }))).toEqual({ aal: 'aal2', sessionId: 'abc' }));
  it('буруу token', () => expect(tokenClaims('garbage')).toEqual({ aal: 'aal1', sessionId: null }));
});

describe('платформ', () => {
  it.each([['mobile', 'mobile'], ['MOBILE', 'mobile'], ['web', 'web'], [undefined, 'web']])('%s → %s', (input, expected) => expect(platformOf(input)).toBe(expected));
});

describe('нэг платформ = нэг нэвтрэлт', () => {
  it('тохиргоо эрхээр үйлчилнэ', async () => {
    expect(await enforcedFor('student')).toBe(true);
    expect(await enforcedFor('teacher')).toBe(false);
  });
  it('идэвхтэй session зөвшөөрнө', async () => {
    clearSessionCache();
    expect(await isCurrent(user('S-WEB-1'), 'web')).toBe(true);
  });
  it('хуучин session-ийг хаана', async () => {
    clearSessionCache();
    expect(await isCurrent(user('S-WEB-OLD'), 'web')).toBe(false);
  });
  it('өөр платформ бие даасан — бүртгэлгүй бол өөрөө эзэмшинэ', async () => {
    clearSessionCache();
    expect(await isCurrent(user('S-MOB-1'), 'mobile')).toBe(true);
  });
});
