import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticate, getBiometricInfo, type BiometricInfo } from '../services/biometric';
import { useAuthStore } from '../store/auth.store';
import { useSettingsStore } from '../store/settings.store';
import { spacing, useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

/** Background-д энэ хугацаанаас удаан байвал дахин түгжинэ */
const GRACE_MS = 30_000;

/**
 * Face ID / хурууны хээний түгжээ (§51).
 * Апп нээх бүрт, мөн 30 секундээс удаан background-д байсны дараа асууна.
 * Modal ашигласан тул нээлттэй BottomSheet-ийн дээгүүр ч харагдана.
 */
export function AppLock() {
  const { colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const enabled = useSettingsStore((s) => s.biometricEnabled);
  const locked = useSettingsStore((s) => s.locked);
  const lock = useSettingsStore((s) => s.lock);
  const unlock = useSettingsStore((s) => s.unlock);

  const [info, setInfo] = useState<BiometricInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backgroundAt = useRef<number | null>(null);
  const prompted = useRef(false);

  const visible = status === 'signedIn' && enabled && locked;

  useEffect(() => {
    void getBiometricInfo().then(setInfo);
  }, []);

  // Background → foreground үед түгжих
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt.current = Date.now();
      if (state === 'active' && backgroundAt.current !== null) {
        const away = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (useSettingsStore.getState().biometricEnabled && away > GRACE_MS) {
          prompted.current = false;
          lock();
        }
      }
    });
    return () => sub.remove();
  }, [lock]);

  const tryUnlock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await authenticate();
    setBusy(false);
    if (res.ok) unlock();
    else if (res.error && res.error !== 'user_cancel' && res.error !== 'system_cancel' && res.error !== 'app_cancel') {
      setError('Баталгаажуулалт амжилтгүй боллоо. Дахин оролдоно уу.');
    }
  }, [busy, unlock]);

  // Түгжигдмэгц автоматаар нэг удаа асууна
  useEffect(() => {
    if (!visible) {
      prompted.current = false;
      return;
    }
    if (prompted.current || AppState.currentState !== 'active') return;
    prompted.current = true;
    const t = setTimeout(() => void tryUnlock(), 350);
    return () => clearTimeout(t);
  }, [visible, tryUnlock]);

  // Биометр бүртгэлээ утаснаасаа устгасан бол түгжээг унтраана
  useEffect(() => {
    if (visible && info && !info.available) {
      useSettingsStore.getState().update({ biometricEnabled: false });
      unlock();
    }
  }, [visible, info, unlock]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={() => undefined} statusBarTranslucent>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <AppText variant="title" center>
            Апп түгжигдсэн байна
          </AppText>
          <AppText tone="muted" center>
            {profile?.user.full_name ? `${profile.user.full_name}, ` : ''}
            {info?.label ?? 'Биометр'}-ээр түгжээгээ тайлна уу.
          </AppText>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={info?.icon ?? 'lock-closed-outline'} size={44} color={colors.accent} />
          </View>
          {error ? (
            <AppText variant="caption" tone="danger" center>
              {error}
            </AppText>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button title={`${info?.label ?? 'Биометр'}-ээр тайлах`} icon={info?.icon ?? 'lock-open-outline'} onPress={() => void tryUnlock()} loading={busy} fullWidth />
          <Button title="Гарч, нууц үгээр нэвтрэх" variant="ghost" onPress={() => void signOut()} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: { width: 84, height: 84, borderRadius: 18, marginBottom: spacing.sm },
  iconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  actions: { gap: spacing.sm },
});
