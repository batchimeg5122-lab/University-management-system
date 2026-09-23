import { Router } from 'express';
import { requireAuth } from './middleware/auth.middleware';
import { enforceStaffMfa } from './middleware/mfa.middleware';
import { enforceSingleSession } from './middleware/session.middleware';
import { settingsRoutes } from './modules/settings/settings.routes';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { auditLogsRoutes } from './modules/audit-logs/audit-logs.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { broadcastsRoutes } from './modules/broadcasts/broadcasts.routes';
import { certificatesRoutes, publicCertificateRoutes } from './modules/certificates/certificates.routes';
import { classesRoutes } from './modules/classes/classes.routes';
import { coursesRoutes } from './modules/courses/courses.routes';
import { devicesRoutes } from './modules/devices/devices.routes';
import { discountRulesRoutes } from './modules/discount-rules/discount-rules.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { calendarRoutes } from './modules/calendar/calendar.routes';
import { departmentsRoutes } from './modules/departments/departments.routes';
import { employeesRoutes } from './modules/employees/employees.routes';
import { enrollmentsRoutes } from './modules/enrollments/enrollments.routes';
import { examsRoutes } from './modules/exams/exams.routes';
import { gradesRoutes } from './modules/grades/grades.routes';
import { invoicesRoutes } from './modules/invoices/invoices.routes';
import { materialsRoutes } from './modules/materials/materials.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { programsRoutes } from './modules/programs/programs.routes';
import { reportsRoutes } from './modules/reports/reports.routes';
import { roomsRoutes } from './modules/rooms/rooms.routes';
import { schedulesRoutes } from './modules/schedules/schedules.routes';
import { semestersRoutes } from './modules/semesters/semesters.routes';
import { publicStudentCardRoutes, studentCardRoutes } from './modules/student-card/student-card.routes';
import { studentsRoutes } from './modules/students/students.routes';
import { subjectsRoutes } from './modules/subjects/subjects.routes';
import { teacherRoutes } from './modules/teacher/teacher.routes';
import { usersRoutes } from './modules/users/users.routes';

export const routes = Router();

// Нээлттэй: /auth/lookup, тодорхойлолт шалгах (auth/me дотроо requireAuth-тай)
routes.use(authRoutes);
routes.use(publicCertificateRoutes);
routes.use(publicStudentCardRoutes);

// Эндээс доош бүх route нэвтрэлт шаардана
routes.use(requireAuth, enforceSingleSession, enforceStaffMfa);
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
  roomsRoutes,
  materialsRoutes,
  certificatesRoutes,
  invoicesRoutes,
  paymentsRoutes,
  notificationsRoutes,
  reportsRoutes,
  auditLogsRoutes,
  devicesRoutes,
  teacherRoutes,
  studentCardRoutes,
  broadcastsRoutes,
  examsRoutes,
  discountRulesRoutes,
  calendarRoutes,
  analyticsRoutes,
  settingsRoutes,
);
