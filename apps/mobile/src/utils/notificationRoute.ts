import type { NavigationProp } from '@react-navigation/native';
import type { AppStackParamList } from '../navigation/types';
import type { UserRole } from '../types/models';

export interface NotificationData {
  type?: string;
  /** 'exam' — шалгалтын мэдэгдэл */
  kind?: string;
  course_id?: string;
  id?: string;
}

type Nav = NavigationProp<AppStackParamList>;

/**
 * Мэдэгдлийн төрлөөс хамаарч тохирох дэлгэц рүү шилжинэ.
 * Push дарах, сануулга дарах, апп доторх мэдэгдэл — бүгд үүнийг ашиглана.
 * @returns шилжсэн эсэх
 */
export function openNotificationTarget(navigation: Nav, role: UserRole | null | undefined, data: NotificationData | null | undefined): boolean {
  const type = data?.type ?? '';
  const courseId = data?.course_id;

  const tab = (screen: 'ScheduleTab' | 'CoursesTab' | 'NotificationsTab' | 'HomeTab') => navigation.navigate('MainTabs', { screen });

  if (data?.kind === 'exam' || type === 'exam-reminder') return navigation.navigate('Exams'), true;
  if (type === 'schedule' || type === 'reminder') return tab('ScheduleTab'), true;
  if (type === 'announcement') return navigation.navigate('Announcements'), true;

  if (role === 'teacher') {
    if (type === 'grade') return courseId ? navigation.navigate('GradeEntry', { courseId }) : tab('CoursesTab'), true;
    if (type === 'attendance' && courseId) return navigation.navigate('AttendanceEntry', { courseId }), true;
    if (courseId) return navigation.navigate('TeacherCourseDetail', { courseId }), true;
    return tab('NotificationsTab'), true;
  }

  // Оюутан
  if (type === 'grade') return navigation.navigate('Grades'), true;
  if (type === 'finance') return navigation.navigate('Finance'), true;
  if (type === 'attendance') return navigation.navigate('Attendance'), true;
  if (type === 'general' && courseId) return navigation.navigate('Materials', { courseId }), true;
  return tab('NotificationsTab'), true;
}

/** Апп доторх мэдэгдэлд "Нээх" товч харуулах эсэх */
export function hasTarget(type: string | undefined): boolean {
  return ['grade', 'schedule', 'finance', 'attendance', 'announcement'].includes(type ?? '');
}
