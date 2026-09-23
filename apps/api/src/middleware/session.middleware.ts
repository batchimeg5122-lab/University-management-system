import type { NextFunction, Request, Response } from 'express';
import { enforcedFor, isCurrent, platformOf } from '../modules/auth/sessions.service';
import { HttpError } from './error.middleware';

/** Session-ээ эзэмшүүлэх хүсэлт — хязгаарлалтаас чөлөөтэй */
const ALLOWED = ['/auth/login-event'];

/**
 * "Платформ тус бүрт нэг нэвтрэлт" (Админ → Системийн тохиргоо).
 * Web дээр нэг, mobile дээр нэг session зэрэг ажиллана.
 * Хуучин session-ээс ирсэн хүсэлтийг 401 SESSION_REPLACED-ээр буцаана.
 */
export async function enforceSingleSession(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user?.sessionId || ALLOWED.includes(req.path)) return next();
    if (!(await enforcedFor(user.role))) return next();
    if (await isCurrent(user, platformOf(req.headers['x-client-platform']))) return next();
    next(new HttpError(401, 'Таны бүртгэлээр өөр төхөөрөмжөөс нэвтэрсэн тул энэ төхөөрөмжийн нэвтрэлт хаагдлаа.', 'SESSION_REPLACED'));
  } catch (err) {
    next(err);
  }
}
