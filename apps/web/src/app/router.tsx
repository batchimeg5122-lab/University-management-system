import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_HOME } from '@/lib/constants';

// Хуудас бүрийг тусад нь ачаална (code splitting)
const page = (loader: () => Promise<{ default: ComponentType }>) => {
  const Component = lazy(loader);
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
};

function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? ROLE_HOME[session.user.role] : '/login'} replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: page(() => import('@/pages/auth/LoginPage')) },
  // Нээлттэй: тодорхойлолтын үнэн эсэхийг шалгах
  { path: '/verify', element: page(() => import('@/pages/VerifyCertificatePage')) },
  { path: '/verify/:code', element: page(() => import('@/pages/VerifyCertificatePage')) },
  // Нээлттэй: цахим оюутны үнэмлэхийн QR шалгах
  { path: '/id/:token', element: page(() => import('@/pages/VerifyStudentCardPage')) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'notifications', element: page(() => import('@/pages/NotificationsPage')) },
          { path: 'calendar', element: page(() => import('@/pages/CalendarPage')) },
          { path: 'security', element: page(() => import('@/pages/SecurityPage')) },

          {
            // Цахим үнэмлэх шалгах самбар (номын сан, хамгаалалт)
            path: 'card-check',
            element: <RoleGuard roles={['management', 'academic', 'finance', 'teacher']} />,
            children: [{ index: true, element: page(() => import('@/pages/CardCheckPage')) }],
          },
          {
            path: 'admin',
            element: <RoleGuard roles={['super_admin']} />,
            children: [
              { index: true, element: page(() => import('@/pages/admin/AdminDashboard')) },
              { path: 'users', element: page(() => import('@/pages/admin/UsersPage')) },
              { path: 'departments', element: page(() => import('@/pages/admin/DepartmentsPage')) },
              { path: 'programs', element: page(() => import('@/pages/admin/ProgramsPage')) },
              { path: 'audit-logs', element: page(() => import('@/pages/admin/AuditLogsPage')) },
              { path: 'mobile', element: page(() => import('@/pages/admin/MobileStatsPage')) },
              { path: 'settings', element: page(() => import('@/pages/admin/SettingsPage')) },
              { path: 'login-history', element: page(() => import('@/pages/admin/LoginHistoryPage')) },
            ],
          },

          {
            path: 'management',
            element: <RoleGuard roles={['management']} />,
            children: [
              { index: true, element: page(() => import('@/pages/management/ManagementDashboard')) },
              { path: 'schools', element: page(() => import('@/pages/management/SchoolStatsPage')) },
              { path: 'departments', element: page(() => import('@/pages/management/DepartmentStatsPage')) },
              { path: 'weekly', element: page(() => import('@/pages/management/WeeklyReportPage')) },
            ],
          },

          {
            path: 'academic',
            children: [
              {
                element: <RoleGuard roles={['academic']} />,
                children: [
                  { index: true, element: page(() => import('@/pages/academic/AcademicDashboard')) },
                  { path: 'classes', element: page(() => import('@/pages/academic/ClassesPage')) },
                  { path: 'subjects', element: page(() => import('@/pages/academic/SubjectsPage')) },
                  { path: 'semesters', element: page(() => import('@/pages/academic/SemestersPage')) },
                  { path: 'courses', element: page(() => import('@/pages/academic/CoursesPage')) },
                  { path: 'schedules', element: page(() => import('@/pages/academic/SchedulesPage')) },
                  { path: 'schedule-board', element: page(() => import('@/pages/academic/ScheduleBoardPage')) },
                  { path: 'rooms', element: page(() => import('@/pages/academic/RoomsPage')) },
                  { path: 'grades', element: page(() => import('@/pages/academic/GradeApprovalPage')) },
                ],
              },
              {
                // Удирдлага зөвхөн харах эрхтэй
                element: <RoleGuard roles={['academic', 'management']} />,
                children: [
                  { path: 'students', element: page(() => import('@/pages/academic/StudentsPage')) },
                  { path: 'students/:id', element: page(() => import('@/pages/academic/StudentDetailPage')) },
                  { path: 'teachers', element: page(() => import('@/pages/academic/TeachersPage')) },
                  { path: 'announcements', element: page(() => import('@/pages/academic/AnnouncementsPage')) },
                  { path: 'broadcasts', element: page(() => import('@/pages/academic/BroadcastsPage')) },
                  { path: 'exams', element: page(() => import('@/pages/academic/ExamsPage')) },
                  { path: 'at-risk', element: page(() => import('@/pages/academic/AtRiskPage')) },
                  { path: 'trends', element: page(() => import('@/pages/academic/TrendsPage')) },
                ],
              },
            ],
          },

          {
            path: 'finance',
            children: [
              {
                element: <RoleGuard roles={['finance']} />,
                children: [
                  { index: true, element: page(() => import('@/pages/finance/FinanceDashboard')) },
                  { path: 'invoices', element: page(() => import('@/pages/finance/InvoicesPage')) },
                  { path: 'payments', element: page(() => import('@/pages/finance/PaymentsPage')) },
                  { path: 'reconcile', element: page(() => import('@/pages/finance/ReconcilePage')) },
                  { path: 'discount-rules', element: page(() => import('@/pages/finance/DiscountRulesPage')) },
                ],
              },
              {
                element: <RoleGuard roles={['finance', 'management']} />,
                children: [
                  { path: 'reports', element: page(() => import('@/pages/finance/FinanceReportsPage')) },
                  { path: 'debtors', element: page(() => import('@/pages/finance/DebtorsPage')) },
                ],
              },
            ],
          },

          {
            path: 'teacher',
            element: <RoleGuard roles={['teacher']} />,
            children: [
              { index: true, element: page(() => import('@/pages/teacher/TeacherDashboard')) },
              { path: 'courses', element: page(() => import('@/pages/teacher/MyCoursesPage')) },
              { path: 'courses/:courseId', element: <Navigate to="attendance" replace /> },
              { path: 'courses/:courseId/attendance', element: page(() => import('@/pages/teacher/CourseAttendancePage')) },
              { path: 'courses/:courseId/grades', element: page(() => import('@/pages/teacher/CourseGradesPage')) },
              { path: 'courses/:courseId/materials', element: page(() => import('@/pages/teacher/CourseMaterialsPage')) },
              { path: 'courses/:courseId/stats', element: page(() => import('@/pages/teacher/CourseStatsPage')) },
              { path: 'schedule', element: page(() => import('@/pages/teacher/TeacherSchedulePage')) },
            ],
          },

          {
            path: 'student',
            element: <RoleGuard roles={['student']} />,
            children: [
              { index: true, element: page(() => import('@/pages/student/StudentDashboard')) },
              { path: 'schedule', element: page(() => import('@/pages/student/MySchedulePage')) },
              { path: 'courses', element: page(() => import('@/pages/student/MyCoursesPage')) },
              { path: 'attendance', element: page(() => import('@/pages/student/MyAttendancePage')) },
              { path: 'grades', element: page(() => import('@/pages/student/MyGradesPage')) },
              { path: 'materials', element: page(() => import('@/pages/student/MyMaterialsPage')) },
              { path: 'certificates', element: page(() => import('@/pages/student/MyCertificatesPage')) },
              { path: 'finance', element: page(() => import('@/pages/student/MyFinancePage')) },
              { path: 'profile', element: page(() => import('@/pages/student/MyProfilePage')) },
            ],
          },

          { path: '*', element: page(() => import('@/pages/NotFoundPage')) },
        ],
      },
    ],
  },
]);
