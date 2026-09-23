import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from '../theme';
import { AppText } from './AppText';

export interface StatTileProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'accent' | 'success' | 'warn' | 'danger' | 'gold';
  hint?: string;
  onPress?: () => void;
}

export function StatTile({ label, value, icon, tone = 'accent', hint, onPress }: StatTileProps) {
  const { colors } = useTheme();
  const fg = colors[tone];
  const bg = { accent: colors.accentSoft, success: colors.successSoft, warn: colors.warnSoft, danger: colors.dangerSoft, gold: colors.goldSoft }[tone];

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <AppText variant="title" mono numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </AppText>
      {hint ? (
        <AppText variant="small" tone="faint" numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** 2 баганатай grid */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
