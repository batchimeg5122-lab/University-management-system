import { StyleSheet, View } from 'react-native';
import { spacing, useTheme } from '../theme';
import { AppText } from './AppText';

/** Шошго — утга мөр (профайл, дэлгэрэнгүй) */
export function InfoRow({ label, value, last }: { label: string; value?: string | number | null; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <AppText variant="caption" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <AppText weight="500" style={styles.value} selectable>
        {value === null || value === undefined || value === '' ? '—' : String(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  label: { width: 120 },
  value: { flex: 1, textAlign: 'right' },
});
