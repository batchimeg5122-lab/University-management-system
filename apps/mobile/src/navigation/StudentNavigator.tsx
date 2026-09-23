import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarScreen } from '../screens/common/CalendarScreen';
import { ExamsScreen } from '../screens/common/ExamsScreen';
import { AnnouncementsScreen } from '../screens/common/NotificationsScreen';
import { VerifyCertificateScreen } from '../screens/common/VerifyCertificateScreen';
import { AttendanceDetailScreen } from '../screens/student/AttendanceDetailScreen';
import { AttendanceScreen } from '../screens/student/AttendanceScreen';
import { CertificateDetailScreen } from '../screens/student/CertificateDetailScreen';
import { CertificatesScreen } from '../screens/student/CertificatesScreen';
import { CourseDetailScreen } from '../screens/student/CourseDetailScreen';
import { FinanceScreen } from '../screens/student/FinanceScreen';
import { GPAScreen } from '../screens/student/GPAScreen';
import { GradesScreen } from '../screens/student/GradesScreen';
import { MaterialsScreen } from '../screens/student/MaterialsScreen';
import { PaymentHistoryScreen } from '../screens/student/PaymentHistoryScreen';
import { StudentCardScreen } from '../screens/student/StudentCardScreen';
import { StudentCoursesScreen } from '../screens/student/StudentCoursesScreen';
import { StudentHomeScreen } from '../screens/student/StudentHomeScreen';
import { useTheme } from '../theme';
import { MainTabs } from './MainTabs';
import { stackOptions } from './options';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

function StudentTabs() {
  return <MainTabs Home={StudentHomeScreen} Courses={StudentCoursesScreen} order={['HomeTab', 'ScheduleTab', 'CoursesTab', 'NotificationsTab', 'ProfileTab']} />;
}

/** §60 Оюутны screen бүтэц */
export function StudentNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackOptions(colors)}>
      <Stack.Screen name="MainTabs" component={StudentTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={({ route }) => ({ title: route.params.course.subject_code ?? 'Хичээл' })} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Ирц' }} />
      <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} options={{ title: 'Ирцийн түүх' }} />
      <Stack.Screen name="Grades" component={GradesScreen} options={{ title: 'Дүн' }} />
      <Stack.Screen name="GPA" component={GPAScreen} options={{ title: 'GPA' }} />
      <Stack.Screen name="Finance" component={FinanceScreen} options={{ title: 'Санхүү' }} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Төлбөрийн түүх' }} />
      <Stack.Screen name="Materials" component={MaterialsScreen} options={({ route }) => ({ title: route.params?.title ?? 'Материал' })} />
      <Stack.Screen name="Certificates" component={CertificatesScreen} options={{ title: 'Тодорхойлолт' }} />
      <Stack.Screen name="CertificateDetail" component={CertificateDetailScreen} options={{ title: 'Тодорхойлолт' }} />
      <Stack.Screen name="StudentCard" component={StudentCardScreen} options={{ title: 'Цахим үнэмлэх' }} />
      <Stack.Screen name="Exams" component={ExamsScreen} options={{ title: 'Шалгалтын хуваарь' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Академик календарь' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Зарлал' }} />
      <Stack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} options={{ title: 'Тодорхойлолт шалгах' }} />
    </Stack.Navigator>
  );
}
