import type { Response } from 'express';
import type { PostgrestError } from '@supabase/supabase-js';
import { HttpError } from '../middleware/error.middleware';

/** Бүх амжилттай хариу `{ data }` хэлбэртэй */
export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ data });
}

export function toHttpError(e: PostgrestError): HttpError {
  switch (e.code) {
    case '23505': return new HttpError(409, 'Ийм бичлэг аль хэдийн бүртгэлтэй байна.');
    case '23503': return new HttpError(409, 'Холбоотой бичлэг байгаа тул энэ үйлдлийг хийх боломжгүй.');
    case '23514': return new HttpError(422, e.message.startsWith('Дуусах') ? e.message : `Утга шалгуурт тэнцсэнгүй: ${e.message}`);
    case '23P01': return new HttpError(409, e.message); // хуваарийн давхцал (DB trigger)
    case '22P02': return new HttpError(400, 'Буруу форматтай утга (ID эсвэл огноо) илгээсэн байна.');
    case 'PGRST116': return new HttpError(404, 'Бичлэг олдсонгүй.');
    default: return new HttpError(500, `Өгөгдлийн сангийн алдаа: ${e.message}`);
  }
}

/**
 * Supabase хариуг задална, алдаа гарвал HttpError шиднэ.
 * `supabase gen types` ашиглаагүй тул анхдагч төрөл нь any.
 * Generated type нэмсний дараа `run<Tables<'students'>>(...)` гэж нарийвчилж болно.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function run<T = any>(query: PromiseLike<{ data: unknown; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw toHttpError(error);
  return data as T;
}

/** Хоосон биш байхыг шаардана */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function required<T = any>(rows: T[] | null, message = 'Бичлэг олдсонгүй.'): T[] {
  if (!rows || rows.length === 0) throw new HttpError(404, message);
  return rows;
}
