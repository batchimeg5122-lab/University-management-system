import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { HttpError } from './error.middleware';

/**
 * Хичээлийн материалыг ХАРАХ эрх:
 *   - багш: зөвхөн өөрийн заадаг хичээл
 *   - оюутан: зөвхөн бүртгэлтэй хичээл
 *   - сургалтын алба, удирдлага, админ: бүгд
 */
export const requireCourseView =
  (param = 'id') =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const courseId = req.params[param];
      if (['super_admin', 'academic', 'management'].includes(user.role)) return next();

      if (user.role === 'teacher') {
        const course = await supabase.from('courses').select('teacher_id').eq('id', courseId).maybeSingle();
        if (!course.data) throw new HttpError(404, 'Хичээл олдсонгүй.');
        if (course.data.teacher_id !== user.employeeId) throw new HttpError(403, 'Та зөвхөн өөрийн хичээлд хандах боломжтой.');
        return next();
      }

      if (user.role === 'student') {
        const enrolled = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('student_id', user.studentId ?? '')
          .neq('status', 'dropped')
          .maybeSingle();
        if (!enrolled.data) throw new HttpError(403, 'Та энэ хичээлд бүртгэлгүй байна.');
        return next();
      }

      throw new HttpError(403, 'Хандах эрх алга.');
    } catch (err) {
      next(err);
    }
  };
