import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { spacing, useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
      {label ? (
        <AppText tone="muted" variant="caption">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, message }: { icon?: keyof typeof Ionicons.glyphMap; title: string; message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={colors.faint} />
      </View>
      <AppText weight="600" center>
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" tone="muted" center>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      <View style={[styles.iconWrap, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <AppText weight="600" center>
        Мэдээлэл ачаалж чадсангүй
      </AppText>
      <AppText variant="caption" tone="muted" center>
        {message}
      </AppText>
      {onRetry ? <Button title="Дахин оролдох" icon="refresh" variant="secondary" size="sm" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  box: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
});
