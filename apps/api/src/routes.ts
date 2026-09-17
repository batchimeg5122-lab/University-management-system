import { Router } from 'express';
import { requireAuth } from './middleware/auth.middleware';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { auditLogsRoutes } from './modules/audit-logs/audit-logs.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { classesRoutes } from './modules/classes/classes.routes';
import { coursesRoutes } from './modules/courses/courses.routes';
import { departmentsRoutes } from './modules/departments/departments.routes';
import { employeesRoutes } from './modules/employees/employees.routes';
import { enrollmentsRoutes } from './modules/enrollments/enrollments.routes';
import { gradesRoutes } from './modules/grades/grades.routes';
import { invoicesRoutes } from './modules/invoices/invoices.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { programsRoutes } from './modules/programs/programs.routes';
import { reportsRoutes } from './modules/reports/reports.routes';
import { schedulesRoutes } from './modules/schedules/schedules.routes';
import { semestersRoutes } from './modules/semesters/semesters.routes';
import { studentsRoutes } from './modules/students/students.routes';
import { subjectsRoutes } from './modules/subjects/subjects.routes';
import { usersRoutes } from './modules/users/users.routes';

export const routes = Router();

// Нээлттэй: /auth/lookup (auth/me дотроо requireAuth-тай)
routes.use(authRoutes);

// Эндээс доош бүх route нэвтрэлт шаардана
routes.use(requireAuth);
routes.use(
  usersRoutes,
  departmentsRoutes,
  programsRoutes,
  semestersRoutes,
  classesRoutes,
  studentsRoutes,
  employeesRoutes,
  subjectsRoutes,
  coursesRoutes,
  enrollmentsRoutes,
  gradesRoutes,
  attendanceRoutes,
  schedulesRoutes,
  invoicesRoutes,
  paymentsRoutes,
  notificationsRoutes,
  reportsRoutes,
  auditLogsRoutes,
);
