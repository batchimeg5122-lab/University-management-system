import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, type AttendanceRowInput } from '../api/attendance.api';
import { authApi } from '../api/auth.api';
import { calendarApi } from '../api/calendar.api';
import { certificateApi, type CertificateInput } from '../api/certificate.api';
import { courseApi } from '../api/course.api';
import { examApi } from '../api/exam.api';
import { financeApi } from '../api/finance.api';
import { gradeApi } from '../api/grade.api';
import { materialApi, type MaterialInput } from '../api/material.api';
import { notificationApi } from '../api/notification.api';
import { scheduleApi } from '../api/schedule.api';
import { studentCardApi } from '../api/studentCard.api';
import { teacherApi } from '../api/teacher.api';
import { useAuthStore } from '../store/auth.store';

/** Query key-ууд — эхний элемент нь offline persist шүүлтүүрт ашиглагдана */
export const qk = {
  me: ['me'] as const,
  courses: ['courses'] as const,
  schedules: (courseId?: string) => ['schedules', courseId ?? 'all'] as const,
  semester: ['semester', 'current'] as const,
  notifications: ['notifications'] as const,
  teacherDashboard: ['teacher-dashboard'] as const,
  summary: ['student-summary'] as const,
  grades: ['grades', 'me'] as const,
  attendanceMine: ['attendance', 'me'] as const,
  attendanceCourse: (courseId: string, date?: string) => ['attendance', courseId, date ?? 'all'] as const,
  attendanceDates: (courseId: string) => ['attendance-dates', courseId] as const,
  invoices: ['invoices'] as const,
  payments: ['payments'] as const,
  materialsMine: ['materials', 'me'] as const,
  materialsCourse: (courseId: string) => ['materials', courseId] as const,
  materialStats: (courseId: string) => ['material-stats', courseId] as const,
  certificates: ['certificates'] as const,
  enrollments: (courseId: string) => ['enrollments', courseId] as const,
  gradeItems: (courseId: string) => ['grade-items', courseId] as const,
  courseStats: (courseId: string) => ['course-stats', courseId] as const,
  studentCard: ['student-card'] as const,
  exams: (upcoming: boolean) => ['exams', upcoming ? 'upcoming' : 'all'] as const,
  calendar: ['calendar'] as const,
  cancellations: ['schedules', 'cancellations'] as const,
  workload: ['workload'] as const,
  receipt: (paymentId: string) => ['payments', 'receipt', paymentId] as const,
};

// ------------------------------------------------------------------ Нийтлэг
export const useMe = () =>
  useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      const me = await authApi.me();
      useAuthStore.getState().setProfile(me);
      return me;
    },
  });

export const useCourses = () => useQuery({ queryKey: qk.courses, queryFn: () => courseApi.list() });
export const useSchedules = (courseId?: string) =>
  useQuery({ queryKey: qk.schedules(courseId), queryFn: () => scheduleApi.list(courseId ? { course_id: courseId } : {}) });
export const useCurrentSemester = () => useQuery({ queryKey: qk.semester, queryFn: scheduleApi.currentSemester, staleTime: 10 * 60_000 });

/** Цуцлагдсан хичээлүүд (багш — өөрийнх, оюутан — бүртгэлтэй хичээл) */
export const useCancellations = () => useQuery({ queryKey: qk.cancellations, queryFn: () => scheduleApi.cancellations() });

/**
 * Багш тухайн өдрийн хичээлээ цуцлах / цуцлалтыг буцаах.
 * Серверээс оюутнуудад мэдэгдэл автоматаар илгээгдэнэ.
 */
export function useCancelClass() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['schedules'] });
    qc.invalidateQueries({ queryKey: qk.teacherDashboard });
    qc.invalidateQueries({ queryKey: qk.notifications });
  };
  const cancel = useMutation({
    mutationFn: ({ scheduleId, date, reason }: { scheduleId: string; date: string; reason?: string | null }) =>
      scheduleApi.cancelClass(scheduleId, { date, reason }),
    onSuccess: refresh,
  });
  const restore = useMutation({
    mutationFn: ({ scheduleId, date }: { scheduleId: string; date: string }) => scheduleApi.restoreClass(scheduleId, date),
    onSuccess: refresh,
  });
  return { cancel, restore };
}

/** Шалгалтын хуваарь (Сургалтын алба / багш товлосон) */
export const useExams = (upcoming = true) => useQuery({ queryKey: qk.exams(upcoming), queryFn: () => examApi.list(upcoming) });

/** Академик календарь — өнөөдрөөс хойш 6 сар */
export const useCalendar = () =>
  useQuery({
    queryKey: qk.calendar,
    queryFn: () => {
      const from = new Date();
      const to = new Date(from.getFullYear(), from.getMonth() + 6, from.getDate());
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return calendarApi.list(iso(from), iso(to));
    },
    staleTime: 30 * 60_000,
  });

export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: notificationApi.list });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

// ------------------------------------------------------------------ Оюутан
export const useStudentSummary = () => useQuery({ queryKey: qk.summary, queryFn: gradeApi.summary });
export const useMyGrades = () => useQuery({ queryKey: qk.grades, queryFn: gradeApi.mine });
export const useMyAttendance = () => useQuery({ queryKey: qk.attendanceMine, queryFn: attendanceApi.mine });
export const useMyInvoices = () => useQuery({ queryKey: qk.invoices, queryFn: financeApi.invoices });
export const useMyPayments = () => useQuery({ queryKey: qk.payments, queryFn: financeApi.payments });
export const useMyMaterials = () => useQuery({ queryKey: qk.materialsMine, queryFn: materialApi.mine });
/** QR token-ийг 2 минут тутамд шинэчилнэ (token 10 мин хүчинтэй) */
export const useStudentCard = (active = true) =>
  useQuery({
    queryKey: qk.studentCard,
    queryFn: studentCardApi.mine,
    refetchInterval: active ? 2 * 60_000 : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

export const useCertificates = () => useQuery({ queryKey: qk.certificates, queryFn: certificateApi.mine });

export function useCreateCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CertificateInput) => certificateApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.certificates }),
  });
}

// ------------------------------------------------------------------ Хичээл (хоёулаа)
export const useCourseMaterials = (courseId: string) =>
  useQuery({ queryKey: qk.materialsCourse(courseId), queryFn: () => materialApi.byCourse(courseId), enabled: !!courseId });

// ------------------------------------------------------------------ Багш
export const useTeacherDashboard = () => useQuery({ queryKey: qk.teacherDashboard, queryFn: teacherApi.dashboard });

/** Багшийн хичээлийн цагийн тайлан (ачаалал) */
export const useWorkload = () => useQuery({ queryKey: qk.workload, queryFn: () => teacherApi.workload(), staleTime: 5 * 60_000 });

/** Төлбөр төлсөн баримт — PDF болгоход шаардах мэдээлэл */
export const usePaymentReceipt = (paymentId: string | null) =>
  useQuery({ queryKey: qk.receipt(paymentId ?? 'none'), queryFn: () => financeApi.receipt(paymentId!), enabled: !!paymentId, staleTime: 5 * 60_000 });
export const useEnrollments = (courseId: string) =>
  useQuery({ queryKey: qk.enrollments(courseId), queryFn: () => courseApi.enrollments(courseId), enabled: !!courseId });
export const useGradeItems = (courseId: string) =>
  useQuery({ queryKey: qk.gradeItems(courseId), queryFn: () => gradeApi.items(courseId), enabled: !!courseId });
export const useCourseAttendance = (courseId: string, date?: string) =>
  useQuery({ queryKey: qk.attendanceCourse(courseId, date), queryFn: () => attendanceApi.byCourse(courseId, date), enabled: !!courseId });
export const useAttendanceDates = (courseId: string) =>
  useQuery({ queryKey: qk.attendanceDates(courseId), queryFn: () => attendanceApi.dates(courseId), enabled: !!courseId });
export const useCourseStats = (courseId: string) =>
  useQuery({ queryKey: qk.courseStats(courseId), queryFn: () => gradeApi.courseStats(courseId), enabled: !!courseId });
export const useMaterialStats = (courseId: string) =>
  useQuery({ queryKey: qk.materialStats(courseId), queryFn: () => materialApi.stats(courseId), enabled: !!courseId });

export function useSaveAttendance(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, rows }: { date: string; rows: AttendanceRowInput[] }) => attendanceApi.save(courseId, date, rows),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.attendanceCourse(courseId, v.date) });
      qc.invalidateQueries({ queryKey: qk.attendanceDates(courseId) });
      qc.invalidateQueries({ queryKey: qk.teacherDashboard });
      qc.invalidateQueries({ queryKey: qk.courseStats(courseId) });
    },
  });
}

export function useSaveGrades(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: { enrollment_id: string; scores: Record<string, number> }[]) => gradeApi.save(courseId, rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.enrollments(courseId) });
      qc.invalidateQueries({ queryKey: qk.courseStats(courseId) });
    },
  });
}

export function useSubmitGrades(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gradeApi.submit(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.enrollments(courseId) });
      qc.invalidateQueries({ queryKey: qk.teacherDashboard });
    },
  });
}

export function useUpdateMaterial(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MaterialInput> }) => materialApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materialsCourse(courseId) }),
  });
}

export function useDeleteMaterial(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => materialApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.materialsCourse(courseId) }),
  });
}
