import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../utils/constants';
import { HttpError } from './error.middleware';

/** super_admin бүх route-д нэвтэрнэ */
export const requireRole = (...roles: UserRole[]) => {
  const handler = (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return next(new HttpError(401, 'Нэвтрэх шаардлагатай.'));
    if (role !== 'super_admin' && !roles.includes(role)) {
      return next(new HttpError(403, 'Энэ үйлдлийг хийх эрх танд байхгүй байна.'));
    }
    next();
  };
  // API баримт бичиг (Swagger)-т эрхийг харуулахын тулд
  (handler as unknown as { roles: UserRole[] }).roles = roles;
  return handler;
};
