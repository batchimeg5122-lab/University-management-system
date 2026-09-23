import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing, useTheme } from '../theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'default' | 'accent' | 'warn' | 'danger' | 'success';
  accessibilityLabel?: string;
}

export function Card({ children, onPress, style, padded = true, tone = 'default', accessibilityLabel }: CardProps) {
  const { colors } = useTheme();
  const bg = {
    default: colors.surface,
    accent: colors.accentSoft,
    warn: colors.warnSoft,
    danger: colors.dangerSoft,
    success: colors.successSoft,
  }[tone];
  const base = [styles.card, { backgroundColor: bg, borderColor: tone === 'default' ? colors.border : 'transparent' }, padded && styles.padded, style];

  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...base, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
  padded: { padding: spacing.lg },
});
