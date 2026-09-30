import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Course } from '../types/models';

/** Нэвтрээгүй үеийн stack */
export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: { email?: string } | undefined;
  VerifyCertificate: { code?: string } | undefined;
};

/** Доод navigation (оюутан, багш хоёуланд ижил нэртэй) */
export type TabParamList = {
  HomeTab: undefined;
  ScheduleTab: undefined;
  CoursesTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

/** Нэвтэрсний дараах stack — оюутан, багшийн бүх дэлгэц */
export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  // --- Нийтлэг
  Announcements: undefined;
  Exams: undefined;
  Calendar: undefined;
  VerifyCertificate: { code?: string } | undefined;
  // --- Оюутан
  CourseDetail: { course: Course };
  Attendance: undefined;
  AttendanceDetail: { courseId: string; subjectName: string };
  Grades: undefined;
  GPA: undefined;
  Finance: undefined;
  PaymentHistory: undefined;
  Materials: { courseId?: string; title?: string } | undefined;
  Certificates: undefined;
  CertificateDetail: { id: string };
  StudentCard: undefined;
  // --- Багш
  TeacherCourseDetail: { courseId: string; title?: string };
  StudentList: { courseId: string; title?: string };
  AttendanceEntry: { courseId: string; title?: string; date?: string };
  GradeEntry: { courseId: string; title?: string };
  TeacherMaterials: { courseId: string; title?: string };
  Statistics: { courseId?: string; title?: string } | undefined;
  Workload: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends AppStackParamList {}
  }
}
