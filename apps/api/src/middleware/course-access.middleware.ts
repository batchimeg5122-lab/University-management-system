import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { HttpError } from './error.middleware';

/**
 * Багш зөвхөн өөрт оноогдсон хичээлд хандана.
 * Сургалтын алба, удирдлага, админ бүх хичээлд хандана.
 */
export const requireCourseAccess =
  (param = 'id') =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      if (['super_admin', 'academic', 'management'].includes(user.role)) return next();
      if (user.role !== 'teacher') throw new HttpError(403, 'Энэ хичээлийн мэдээлэлд хандах эрх алга.');

      const { data, error } = await supabase.from('courses').select('teacher_id').eq('id', req.params[param]).maybeSingle();
      if (error || !data) throw new HttpError(404, 'Хичээл олдсонгүй.');
      if (data.teacher_id !== user.employeeId) throw new HttpError(403, 'Та зөвхөн өөрт оноогдсон хичээлд хандах боломжтой.');
      next();
    } catch (err) {
      next(err);
    }
  };
