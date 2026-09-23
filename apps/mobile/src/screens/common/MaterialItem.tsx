import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText, Badge, useToast } from '../../components';
import { downloadMaterial, openMaterial } from '../../services/files';
import { spacing, useTheme } from '../../theme';
import type { CourseMaterial } from '../../types/models';
import { bytes, date } from '../../utils/format';

export function fileIcon(mime: string | null | undefined): keyof typeof Ionicons.glyphMap {
  if (!mime) return 'document-outline';
  if (mime.includes('pdf')) return 'document-text-outline';
  if (mime.startsWith('image/')) return 'image-outline';
  if (mime.startsWith('video/')) return 'videocam-outline';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'easel-outline';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return 'grid-outline';
  if (mime.includes('zip')) return 'archive-outline';
  return 'document-outline';
}

/** Материалын мөр — нээх / татах (§19, §20) */
export function MaterialItem({ m, showCourse, onPress, extra }: { m: CourseMaterial; showCourse?: boolean; onPress?: () => void; extra?: React.ReactNode }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState<'open' | 'download' | null>(null);

  const run = async (kind: 'open' | 'download') => {
    setBusy(kind);
    try {
      if (kind === 'open') await openMaterial(m);
      else await downloadMaterial(m);
    } catch (err) {
      toast.show(errorMessage(err), 'danger');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Pressable
      onPress={onPress ?? (() => void run(m.can_preview ? 'open' : 'download'))}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={m.title}
    >
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name={fileIcon(m.mime_type)} size={20} color={colors.accent} />
      </View>
      <View style={styles.body}>
        <AppText weight="600" numberOfLines={2}>
          {m.title}
        </AppText>
        {showCourse && m.subject_name ? (
          <AppText variant="caption" tone="accent" numberOfLines={1}>
            {m.subject_name}
          </AppText>
        ) : null}
        {m.description ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {m.description}
          </AppText>
        ) : null}
        <AppText variant="small" tone="faint" numberOfLines={1}>
          {m.file_name} · {bytes(m.size_bytes)} · {date(m.created_at)}
          {m.uploaded_by_name ? ` · ${m.uploaded_by_name}` : ''}
        </AppText>
        {!m.is_published ? <Badge label="Нийтлээгүй" tone="warn" /> : null}
        {extra}
      </View>
      <View style={styles.actions}>
        {m.can_preview ? (
          <Pressable onPress={() => void run('open')} hitSlop={8} style={styles.action} accessibilityLabel="Нээх" disabled={!!busy}>
            {busy === 'open' ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="eye-outline" size={22} color={colors.accent} />}
          </Pressable>
        ) : null}
        <Pressable onPress={() => void run('download')} hitSlop={8} style={styles.action} accessibilityLabel="Татах" disabled={!!busy}>
          {busy === 'download' ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="download-outline" size={22} color={colors.accent} />}
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  action: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
