import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useOnline } from '../hooks/useOnline';
import { spacing, useTheme } from '../theme';
import { AppText } from './AppText';

/** Интернет тасарсан үед (§44) — хадгалагдсан мэдээллийг харуулж байгааг мэдэгдэнэ */
export function OfflineBanner() {
  const online = useOnline();
  const { colors } = useTheme();
  if (online) return null;
  return (
    <View style={[styles.bar, { backgroundColor: colors.warnSoft }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={16} color={colors.warn} />
      <AppText variant="caption" tone="warn" style={styles.text}>
        Интернет холболт байхгүй байна. Сүүлд хадгалсан мэдээллийг харуулж байна.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  text: { flex: 1 },
});
