import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import { HttpError } from '../../middleware/error.middleware';
import type { AuthUser } from '../../types/express';
import { run } from '../../utils/api-response';
import { localDate } from '../../utils/local-date';
import { studentExtras } from '../auth/auth.service';
import { current as currentSemester } from '../semesters/semesters.service';
import { getStudentView } from '../students/students.view';

/**
 * Цахим оюутны үнэмлэх.
 * QR код нь богино хугацаатай (10 мин), HMAC-аар гарын үсэг зурсан token агуулна:
 *   <student_id 32 hex>.<exp base36>.<signature>
 * - Screenshot хийж бусдад өгөхөд хэдхэн минутын дараа хүчингүй болно
 * - Token-д хувийн мэдээлэл байхгүй — шалгах үед серверээс уншина
 * - DB-д нэмэлт хүснэгт шаардлагагүй
 *
 * Нууц түлхүүр: STUDENT_CARD_SECRET (заавал биш). Байхгүй бол service key-ээс гаргаж авна.
 */
const SECRET =
  process.env.STUDENT_CARD_SECRET?.trim() || createHmac('sha256', env.SUPABASE_SERVICE_ROLE_KEY).update('ikhzasag-student-card-v1').digest('hex');

export const TOKEN_TTL_SEC = 10 * 60;

const sign = (id: string, exp: number) => createHmac('sha256', SECRET).update(`${id}.${exp}`).digest('base64url').slice(0, 24);

function makeToken(studentId: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const id = studentId.replace(/-/g, '');
  return { token: `${id}.${exp.toString(36)}.${sign(id, exp)}`, expires_at: new Date(exp * 1000).toISOString() };
}

type Parsed = { ok: true; studentId: string; exp: number } | { ok: false };

function parseToken(token: string): Parsed {
  const m = /^([0-9a-f]{32})\.([0-9a-z]{1,10})\.([A-Za-z0-9_-]{24})$/.exec(token.trim());
  if (!m) return { ok: false };
  const [, id, expRaw, sig] = m;
  const exp = parseInt(expRaw, 36);
  const expected = Buffer.from(sign(id, exp));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false };
  const studentId = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  return { ok: true, studentId, exp };
}

/** Үнэмлэх хүчинтэй эсэх: оюутан идэвхтэй + одоогийн улирал дуусаагүй */
async function cardInfo(studentId: string) {
  const [student, extras, semester] = await Promise.all([getStudentView(studentId), studentExtras(studentId), currentSemester()]);
  const user = await run(supabase.from('users').select('avatar_url, status').eq('id', student.user_id).maybeSingle());
  const validUntil: string | null = semester?.end_date ?? null;
  const active = student.status === 'active' && user?.status === 'active';
  const inPeriod = !!validUntil && localDate() <= validUntil;

  return {
    card: {
      student_id: student.id,
      full_name: student.full_name,
      last_name: student.last_name,
      first_name: student.first_name,
      student_code: student.student_code,
      program_name: student.program_name,
      department_name: student.department_name,
      school_name: extras.school_name,
      class_name: student.class_name,
      year_level: extras.year_level,
      enrollment_year: student.enrollment_year,
      status: student.status,
      avatar_url: (user?.avatar_url as string | null) ?? null,
      semester: semester ? `${semester.academic_year} ${semester.name}` : null,
      valid_until: validUntil,
    },
    valid: active && inPeriod,
    reason: !active ? 'inactive' : !inPeriod ? 'expired_card' : 'ok',
  };
}

/** Оюутан өөрийн үнэмлэх + шинэ QR token */
export async function mine(actor: AuthUser) {
  if (!actor.studentId) throw new HttpError(404, 'Оюутны бүртгэл олдсонгүй.');
  const info = await cardInfo(actor.studentId);
  return { ...info, ...makeToken(actor.studentId), ttl_seconds: TOKEN_TTL_SEC };
}

/**
 * Нээлттэй шалгалт (хамгаалагч, номын сан).
 * Гарын үсэг буруу эсвэл хугацаа дууссан бол хувийн мэдээлэл БУЦААХГҮЙ.
 */
async function verifyWithId(token: string) {
  const checked_at = new Date().toISOString();
  const parsed = parseToken(token);
  if (!parsed.ok) return { studentId: null, result: { valid: false, reason: 'invalid', card: null, checked_at } };
  if (parsed.exp * 1000 < Date.now()) return { studentId: parsed.studentId, result: { valid: false, reason: 'expired_qr', card: null, checked_at } };
  try {
    const info = await cardInfo(parsed.studentId);
    // Шалгагчид хэрэгтэй мэдээллийг л харуулна (и-мэйл, утас, регистр БИШ)
    const { student_id: _id, ...card } = info.card;
    return { studentId: parsed.studentId, result: { valid: info.valid, reason: info.reason, card, checked_at } };
  } catch {
    return { studentId: null, result: { valid: false, reason: 'invalid', card: null, checked_at } };
  }
}

export async function verify(token: string) {
  return (await verifyWithId(token)).result;
}

/** QR/URL-аас token салгаж авна: https://.../id/<token> эсвэл шууд token */
export const extractToken = (value: string) => value.trim().split(/[/?#]/).filter(Boolean).find((p) => /^[0-9a-f]{32}\./.test(p)) ?? value.trim();

/** Ажилтны шалгах самбар: шалгаад түүхэнд бичнэ */
export async function check(value: string, location: string | null, actor: AuthUser) {
  const { studentId, result } = await verifyWithId(extractToken(value));
  const { error } = await supabase.from('student_card_checks').insert({
    student_id: studentId,
    checked_by: actor.id,
    valid: result.valid,
    reason: result.reason,
    location: location || null,
  });
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') console.warn('[card-check]', error.message);
  return result;
}

/** Сүүлийн шалгалтууд + өнөөдрийн тоо */
export async function checks(limit = 100) {
  const { data, error } = await supabase
    .from('student_card_checks')
    .select('*, students(student_code, users(full_name)), checker:users!student_card_checks_checked_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(Math.min(500, limit));
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return { rows: [], today: { total: 0, valid: 0, invalid: 0 } };
    throw new HttpError(500, error.message);
  }
  const rows = (data ?? []).map(({ students, checker, ...r }: any) => ({
    ...r,
    student_code: students?.student_code ?? null,
    student_name: students?.users?.full_name ?? null,
    checked_by_name: checker?.full_name ?? null,
  }));
  const today = localDate();
  const todays = rows.filter((r) => localDate(new Date(r.created_at)) === today);
  return { rows, today: { total: todays.length, valid: todays.filter((r) => r.valid).length, invalid: todays.filter((r) => !r.valid).length } };
}
