import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Card, Input, ThemeToggleButton } from '../../components';
import { BRAND, isConfigured } from '../../constants/env';
import type { AuthScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/auth.store';
import { spacing, useTheme } from '../../theme';

/** §5 Нэвтрэх хуудас: и-мэйл эсвэл оюутны/ажилтны код + нууц үг */
export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { colors } = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const notice = useAuthStore((s) => s.notice);
  const clearNotice = useAuthStore((s) => s.clearNotice);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setError(null);
    clearNotice();
    if (!identifier.trim() || !password) {
      setError('И-мэйл/код болон нууц үгээ оруулна уу.');
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier, password);
    } catch (err) {
      setError((err as Error).message);
      clearNotice();
    } finally {
      setLoading(false);
    }
  };

  const message = error ?? notice;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <ThemeToggleButton />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Их Засаг лого" />
            <AppText variant="display" center>
              {BRAND.shortName}
            </AppText>
            <AppText tone="muted" center>
              Сургалт, санхүүгийн нэгдсэн систем
            </AppText>
          </View>

          {!isConfigured ? (
            <Card tone="warn">
              <AppText variant="caption" tone="warn">
                Апп-ын тохиргоо дутуу байна. mobile/.env файлд EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY-г бөглөөд `npx expo start -c`
                командаар дахин эхлүүлнэ үү.
              </AppText>
            </Card>
          ) : null}

          <View style={styles.form}>
            <Input
              label="И-мэйл / хэрэглэгчийн код"
              placeholder="ST26SE001 эсвэл name@ikhzasag.edu.mn"
              icon="person-outline"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Input
              ref={passwordRef}
              label="Нууц үг"
              placeholder="••••••••"
              icon="lock-closed-outline"
              password
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />

            {message ? (
              <Card tone="danger" padded={false} style={styles.alert}>
                <AppText variant="caption" tone="danger" accessibilityRole="alert">
                  {message}
                </AppText>
              </Card>
            ) : null}

            <Button title="Нэвтрэх" onPress={submit} loading={loading} fullWidth />

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword', { email: identifier.includes('@') ? identifier : undefined })}
              style={styles.link}
              accessibilityRole="link"
            >
              <AppText tone="accent" weight="600">
                Нууц үг мартсан?
              </AppText>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Button title="Тодорхойлолт шалгах" icon="qr-code-outline" variant="ghost" onPress={() => navigation.navigate('VerifyCertificate')} />
            <AppText variant="small" tone="faint" center>
              © {new Date().getFullYear()} {BRAND.name}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  container: { flexGrow: 1, padding: spacing.xl, gap: spacing.xl, justifyContent: 'center' },
  brand: { alignItems: 'center', gap: spacing.xs },
  logo: { width: 96, height: 96, marginBottom: spacing.sm, borderRadius: 20 },
  form: { gap: spacing.lg },
  alert: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  link: { alignSelf: 'center', padding: spacing.sm, minHeight: 44, justifyContent: 'center' },
  footer: { gap: spacing.sm, alignItems: 'center' },
});
