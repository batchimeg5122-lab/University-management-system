import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/** zod schema-аар body/query-г шалгаж, цэвэрлэсэн утгаар солино */
export const validate =
  (schemas: { body?: ZodTypeAny; query?: ZodTypeAny }) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query ?? {}));
      next();
    } catch (err) {
      next(err);
    }
  };
