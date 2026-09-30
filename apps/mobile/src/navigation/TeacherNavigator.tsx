import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarScreen } from '../screens/common/CalendarScreen';
import { ExamsScreen } from '../screens/common/ExamsScreen';
import { AnnouncementsScreen } from '../screens/common/NotificationsScreen';
import { VerifyCertificateScreen } from '../screens/common/VerifyCertificateScreen';
import { AttendanceEntryScreen } from '../screens/teacher/AttendanceEntryScreen';
import { GradeEntryScreen } from '../screens/teacher/GradeEntryScreen';
import { StatisticsScreen } from '../screens/teacher/StatisticsScreen';
import { StudentListScreen } from '../screens/teacher/StudentListScreen';
import { TeacherCourseDetailScreen } from '../screens/teacher/TeacherCourseDetailScreen';
import { TeacherCoursesScreen } from '../screens/teacher/TeacherCoursesScreen';
import { TeacherHomeScreen } from '../screens/teacher/TeacherHomeScreen';
import { TeacherMaterialsScreen } from '../screens/teacher/TeacherMaterialsScreen';
import { WorkloadScreen } from '../screens/teacher/WorkloadScreen';
import { useTheme } from '../theme';
import { MainTabs } from './MainTabs';
import { stackOptions } from './options';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

function TeacherTabs() {
  return <MainTabs Home={TeacherHomeScreen} Courses={TeacherCoursesScreen} order={['HomeTab', 'CoursesTab', 'ScheduleTab', 'NotificationsTab', 'ProfileTab']} />;
}

/** §61 Багшийн screen бүтэц */
export function TeacherNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackOptions(colors)}>
      <Stack.Screen name="MainTabs" component={TeacherTabs} options={{ headerShown: false }} />
      <Stack.Screen name="TeacherCourseDetail" component={TeacherCourseDetailScreen} options={{ title: 'Хичээл' }} />
      <Stack.Screen name="StudentList" component={StudentListScreen} options={{ title: 'Оюутнууд' }} />
      <Stack.Screen name="AttendanceEntry" component={AttendanceEntryScreen} options={{ title: 'Ирц бүртгэх' }} />
      <Stack.Screen name="GradeEntry" component={GradeEntryScreen} options={{ title: 'Дүн оруулах' }} />
      <Stack.Screen name="TeacherMaterials" component={TeacherMaterialsScreen} options={{ title: 'Материал' }} />
      <Stack.Screen name="Statistics" component={StatisticsScreen} options={({ route }) => ({ title: route.params?.title ?? 'Статистик' })} />
      <Stack.Screen name="Workload" component={WorkloadScreen} options={{ title: 'Хичээлийн цаг' }} />
      <Stack.Screen name="Exams" component={ExamsScreen} options={{ title: 'Шалгалтын хуваарь' }} />
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Академик календарь' }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Зарлал' }} />
      <Stack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} options={{ title: 'Тодорхойлолт шалгах' }} />
    </Stack.Navigator>
  );
}
