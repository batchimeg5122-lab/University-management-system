import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing, useTheme } from '../theme';
import { AppText } from './AppText';

export interface ListItemProps {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  left?: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  divider?: boolean;
  unread?: boolean;
}

export function ListItem({ title, subtitle, meta, left, icon, right, onPress, chevron, divider = true, unread }: ListItemProps) {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.row, divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      {left ??
        (icon ? (
          <View style={[styles.iconBox, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={icon} size={20} color={colors.accent} />
          </View>
        ) : null)}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          {unread ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}
          <AppText weight={unread ? '700' : '600'} numberOfLines={2} style={styles.flex}>
            {title}
          </AppText>
        </View>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={3}>
            {subtitle}
          </AppText>
        ) : null}
        {meta ? (
          <AppText variant="small" tone="faint">
            {meta}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron || (onPress && chevron !== false) ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { backgroundColor: colors.surfaceAlt }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
});
