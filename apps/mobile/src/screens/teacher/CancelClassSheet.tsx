import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, BottomSheet, Button, Input, useToast } from '../../components';
import { errorMessage } from '../../api/client';
import { useCancelClass } from '../../hooks/queries';
import { radius, spacing, useTheme } from '../../theme';
import type { Schedule } from '../../types/models';
import { DAY_LABEL } from '../../utils/constants';
import { date as fmtDate, isoDate, nextDateOfWeekday, time } from '../../utils/format';

export interface CancelClassSheetProps {
  visible: boolean;
  onClose: () => void;
  session: Schedule | null;
  /** Аль өдрийг цуцлах — оруулаагүй бол тухайн гарагийн хамгийн дараагийн огноо */
  targetDate?: string;
}

/**
 * Багш яаралтай ажлаар хичээлдээ орох боломжгүй болсон үед
 * тухайн өдрийн хичээлээ цуцлах цонх.
 * Цуцалсны дараа систем тухайн хичээлд хамрагдах бүх оюутанд
 * "Өнөөдрийн хичээл цуцлагдлаа" мэдэгдлийг автоматаар илгээнэ.
 */
export function CancelClassSheet({ visible, onClose, session, targetDate }: CancelClassSheetProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const { cancel, restore } = useCancelClass();
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
      setConfirming(false);
    }
  }, [visible, session?.id]);

  if (!session) return null;

  const today = isoDate();
  const day = targetDate || nextDateOfWeekday(session.day_of_week);
  const isToday = day === today;
  const cancelled = (session.cancellations ?? []).find((c) => c.cancel_date === day);
  const place = session.is_online ? 'Онлайн' : [session.building, session.room].filter(Boolean).join(' · ') || '—';
  const label = isToday ? 'Өнөөдөр хичээл орохгүй' : `${fmtDate(day)}-нд хичээл орохгүй`;

  const doCancel = async () => {
    try {
      await cancel.mutateAsync({ scheduleId: session.id, date: day, reason: reason.trim() || null });
      toast.show(isToday ? 'Өнөөдрийн хичээл цуцлагдлаа. Оюутнуудад мэдэгдэл илгээгдлээ.' : `${fmtDate(day)}-ны хичээл цуцлагдлаа. Оюутнуудад мэдэгдэл илгээгдлээ.`, 'success');
      onClose();
    } catch (err) {
      toast.show(errorMessage(err), 'danger');
    }
  };

  const doRestore = async () => {
    try {
      await restore.mutateAsync({ scheduleId: session.id, date: day });
      toast.show('Цуцлалт хүчингүй болж, хичээл хэвийн орно.', 'success');
      onClose();
    } catch (err) {
      toast.show(errorMessage(err), 'danger');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={session.subject_name ?? 'Хичээл'}>
      <View style={[styles.summary, { backgroundColor: colors.surfaceAlt }]}>
        <Row icon="calendar-outline" text={`${DAY_LABEL[session.day_of_week] ?? ''} · ${fmtDate(day)}`} />
        <Row icon="time-outline" text={`${time(session.start_time)} – ${time(session.end_time)}`} />
        <Row icon={session.is_online ? 'wifi-outline' : 'location-outline'} text={place} />
        <Row icon="people-outline" text={`${session.class_name ?? '—'} · ${session.student_count ?? 0} оюутан`} />
      </View>

      {cancelled ? (
        <>
          <View style={styles.badgeRow}>
            <Badge label="Цуцлагдсан" tone="danger" />
            {isToday ? <Badge label="Өнөөдөр" tone="warn" /> : null}
          </View>
          <AppText variant="caption" tone="muted">
            Энэ өдрийн хичээл цуцлагдсан бөгөөд оюутнуудад мэдэгдэл илгээгдсэн.
            {cancelled.reason ? `\nШалтгаан: ${cancelled.reason}` : ''}
          </AppText>
          <Button
            title="Цуцлалтыг буцаах"
            icon="refresh-outline"
            variant="secondary"
            loading={restore.isPending}
            onPress={doRestore}
            fullWidth
          />
        </>
      ) : !confirming ? (
        <>
          <Pressable
            onPress={() => setConfirming(true)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.option, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
            <View style={styles.flex}>
              <AppText weight="700" style={{ color: colors.danger }}>
                {label}
              </AppText>
              <AppText variant="caption" tone="muted">
                Хичээл цуцлагдаж, бүх оюутанд мэдэгдэл илгээгдэнэ
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.danger} />
          </Pressable>
          <AppText variant="small" tone="faint">
            Зөвхөн тухайн өдрийн хичээл цуцлагдана. Долоо хоногийн хуваарь хэвээр үлдэнэ.
          </AppText>
        </>
      ) : (
        <>
          <AppText weight="600">{label}?</AppText>
          <Input
            label="Шалтгаан (сонголтоор)"
            placeholder="Жишээ: Яаралтай ажил гарсан"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={300}
            hint="Шалтгааныг оюутнуудад илгээх мэдэгдэлд хамт харуулна"
          />
          <View style={styles.actions}>
            <Button title="Болих" variant="secondary" onPress={() => setConfirming(false)} style={styles.flex} />
            <Button title="Цуцлах" variant="danger" icon="send-outline" loading={cancel.isPending} onPress={doCancel} style={styles.flex} />
          </View>
        </>
      )}
    </BottomSheet>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <AppText variant="caption" tone="textSoft" numberOfLines={2} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { borderRadius: radius.md, padding: spacing.md, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
