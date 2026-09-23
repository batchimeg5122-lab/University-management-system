import type { NextFunction, Request, Response } from 'express';
import { get as getSetting } from '../modules/settings/settings.service';
import { HttpError } from './error.middleware';

/** 2FA шаардагдах эрхүүд (багш, оюутан mobile-оор нэвтэрдэг тул хамаарахгүй) */
const STAFF_MFA_ROLES = ['super_admin', 'management', 'academic', 'finance'];

/** 2FA тохируулаагүй ч хандаж болох (тохируулахад хэрэгтэй) замууд */
const ALLOWED = ['/auth/me', '/auth/login-event', '/auth/login-history', '/settings/public', '/notifications'];

/**
 * Системийн тохиргоонд "Ажилтанд 2FA заавал" асаалттай бол
 * aal2 (TOTP баталгаажсан) session-гүй ажилтны хүсэлтийг хаана.
 */
export async function enforceStaffMfa(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user || !STAFF_MFA_ROLES.includes(user.role) || user.aal === 'aal2') return next();
    if (ALLOWED.some((p) => req.path === p || req.path.startsWith(`${p}/`))) return next();
    const { require_staff_mfa } = await getSetting('security');
    if (!require_staff_mfa) return next();
    next(new HttpError(403, 'Хоёр шатлалт баталгаажуулалт (2FA) шаардлагатай. "Аюулгүй байдал" хэсгээс тохируулна уу.', 'MFA_REQUIRED'));
  } catch (e) {
    next(e);
  }
}
