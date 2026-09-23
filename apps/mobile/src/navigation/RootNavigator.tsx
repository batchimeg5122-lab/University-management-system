import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Loading } from '../components';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { VerifyCertificateScreen } from '../screens/common/VerifyCertificateScreen';
import { useAuthStore } from '../store/auth.store';
import { useSettingsStore } from '../store/settings.store';
import { useTheme } from '../theme';
import { stackOptions } from './options';
import { StudentNavigator } from './StudentNavigator';
import { TeacherNavigator } from './TeacherNavigator';
import type { AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const PwStack = createNativeStackNavigator<{ ChangePassword: undefined }>();

/**
 * §52 App Start → Session байгаа эсэх → Dashboard / Login
 * Role-оор Student / Teacher interface нээгдэнэ (§4)
 */
export function RootNavigator() {
  const { colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.profile?.user.role);
  const onboarded = useSettingsStore((s) => s.onboarded);

  if (status === 'loading') return <Loading label="Ачаалж байна..." />;

  if (status === 'mustChangePassword') {
    return (
      <PwStack.Navigator screenOptions={stackOptions(colors)}>
        <PwStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Нууц үг солих' }} />
      </PwStack.Navigator>
    );
  }

  if (status === 'signedIn' && role === 'teacher') return <TeacherNavigator />;
  // Анх удаа нээхэд танилцуулга (нэвтрээгүй үед л)
  if (status === 'signedOut' && !onboarded) return <OnboardingScreen />;
  if (status === 'signedIn' && role === 'student') return <StudentNavigator />;

  return (
    <AuthStack.Navigator screenOptions={stackOptions(colors)}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Нууц үг сэргээх' }} />
      <AuthStack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} options={{ title: 'Тодорхойлолт шалгах' }} />
    </AuthStack.Navigator>
  );
}
