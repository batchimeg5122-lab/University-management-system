import { StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../theme';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'gold';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const map = {
    neutral: [colors.surfaceAlt, colors.muted],
    accent: [colors.accentSoft, colors.accent],
    success: [colors.successSoft, colors.success],
    warn: [colors.warnSoft, colors.warn],
    danger: [colors.dangerSoft, colors.danger],
    gold: [colors.goldSoft, colors.gold],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="small" weight="600" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
