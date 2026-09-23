import { StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../theme';

export function ProgressBar({ value, max = 100, tone = 'accent', height = 8 }: { value: number; max?: number; tone?: 'accent' | 'success' | 'warn' | 'danger'; height?: number }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <View style={[styles.track, { height, backgroundColor: colors.surfaceAlt }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={{ width: `${pct}%`, height, borderRadius: radius.pill, backgroundColor: colors[tone] }} />
    </View>
  );
}

const styles = StyleSheet.create({ track: { borderRadius: radius.pill, overflow: 'hidden' } });
