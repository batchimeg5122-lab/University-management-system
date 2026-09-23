import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export const badRequest = (m: string) => new HttpError(400, m);
export const forbidden = (m = 'Энэ үйлдлийг хийх эрх танд байхгүй байна.') => new HttpError(403, m);
export const notFound = (m = 'Бичлэг олдсонгүй.') => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);
export const unprocessable = (m: string) => new HttpError(422, m);

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Route олдсонгүй: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    return res.status(422).json({ error: { message: `${issue.path.join('.') || 'Утга'}: ${issue.message}`, issues: err.issues } });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, ...(err.code ? { code: err.code } : {}) } });
  }
  console.error(err);
  const message = !env.isProd && err instanceof Error ? err.message : 'Серверийн алдаа гарлаа.';
  return res.status(500).json({ error: { message } });
}
