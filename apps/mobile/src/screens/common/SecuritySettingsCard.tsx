import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { AppText, Card, Segmented, useToast } from '../../components';
import { authenticate, getBiometricInfo, type BiometricInfo } from '../../services/biometric';
import { requestReminderPermission } from '../../services/reminders';
import { REMINDER_OPTIONS, useSettingsStore, type ReminderMinutes } from '../../store/settings.store';
import { spacing, useTheme } from '../../theme';

/** Профайл → Face ID түгжээ, хичээлийн сануулга */
export function SecuritySettingsCard() {
  const { colors } = useTheme();
  const toast = useToast();
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const reminderEnabled = useSettingsStore((s) => s.reminderEnabled);
  const reminderMinutes = useSettingsStore((s) => s.reminderMinutes);
  const update = useSettingsStore((s) => s.update);
  const [info, setInfo] = useState<BiometricInfo | null>(null);

  useEffect(() => {
    void getBiometricInfo().then(setInfo);
  }, []);

  const toggleBiometric = async (value: boolean) => {
    if (!value) return update({ biometricEnabled: false });
    // Асаахаас өмнө нэг удаа баталгаажуулна
    const res = await authenticate(`${info?.label ?? 'Биометр'} түгжээг асаах`);
    if (res.ok) {
      update({ biometricEnabled: true });
      toast.show(`${info?.label ?? 'Биометр'} түгжээ асаалаа`, 'success');
    }
  };

  const toggleReminder = async (value: boolean) => {
    if (!value) return update({ reminderEnabled: false });
    const granted = await requestReminderPermission();
    if (!granted) return toast.show('Мэдэгдэл илгээх зөвшөөрөл өгнө үү (Settings → Их Засаг / Expo Go → Notifications).', 'danger');
    update({ reminderEnabled: true });
    toast.show(`Хичээл бүрээс ${reminderMinutes} минутын өмнө сануулна`, 'success');
  };

  return (
    <Card>
      <AppText variant="label" tone="muted" style={styles.title}>
        АЮУЛГҮЙ БАЙДАЛ, САНУУЛГА
      </AppText>

      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <Ionicons name={info?.icon ?? 'lock-closed-outline'} size={22} color={colors.accent} />
        <View style={styles.flex}>
          <AppText weight="600">{info?.label ?? 'Биометр'} түгжээ</AppText>
          <AppText variant="caption" tone="muted">
            {info && !info.available ? 'Утсандаа Face ID / хурууны хээ бүртгээгүй байна' : 'Апп нээх бүрт түгжээ тайлна'}
          </AppText>
        </View>
        <Switch
          value={biometricEnabled}
          onValueChange={(v) => void toggleBiometric(v)}
          disabled={!info?.available}
          trackColor={{ true: colors.accent }}
          accessibilityLabel={`${info?.label ?? 'Биометр'} түгжээ`}
        />
      </View>

      <View style={styles.row}>
        <Ionicons name="alarm-outline" size={22} color={colors.accent} />
        <View style={styles.flex}>
          <AppText weight="600">Хичээлийн сануулга</AppText>
          <AppText variant="caption" tone="muted">
            Хичээл эхлэхээс өмнө мэдэгдэл ирнэ
          </AppText>
        </View>
        <Switch value={reminderEnabled} onValueChange={(v) => void toggleReminder(v)} trackColor={{ true: colors.accent }} accessibilityLabel="Хичээлийн сануулга" />
      </View>
      {reminderEnabled ? (
        <Segmented<string>
          value={String(reminderMinutes)}
          onChange={(v) => update({ reminderMinutes: Number(v) as ReminderMinutes })}
          options={REMINDER_OPTIONS.map((m) => ({ value: String(m), label: `${m} мин` }))}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  flex: { flex: 1, gap: 2 },
});
