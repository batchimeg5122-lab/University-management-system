import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useThemeStore, type ThemeMode } from '../store/theme.store';
import { radius, useTheme } from '../theme';
import { Segmented } from './Segmented';

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Систем' },
  { value: 'light', label: 'Цайвар' },
  { value: 'dark', label: 'Бараан' },
];

/** Профайл дээрх 3 сонголттой шилжүүлэгч */
export function ThemeSelector() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  return <Segmented<ThemeMode> value={mode} onChange={setMode} options={THEME_OPTIONS} />;
}

/** Нэг товчоор Цайвар ↔ Бараан солих (Login дэлгэц) */
export function ThemeToggleButton() {
  const { dark, colors } = useTheme();
  const setMode = useThemeStore((s) => s.setMode);
  return (
    <Pressable
      onPress={() => setMode(dark ? 'light' : 'dark')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={dark ? 'Цайвар горим руу шилжих' : 'Бараан горим руу шилжих'}
      style={({ pressed }) => [styles.btn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
