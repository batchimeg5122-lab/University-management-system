import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, ChipFilter, QueryView, Screen } from '../../components';
import { useMyAttendance } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { spacing, useTheme } from '../../theme';
import type { AttendanceStatus } from '../../types/models';
import { ATTENDANCE_LABEL, ATTENDANCE_ORDER } from '../../utils/constants';
import { dayLabelOf, shortDate } from '../../utils/format';
import { useStatusColor } from './AttendanceScreen';

/** §13 Нэг хичээлийн ирцийн түүх */
export function AttendanceDetailScreen({ route }: AppScreenProps<'AttendanceDetail'>) {
  const { courseId, subjectName } = route.params;
  const q = useMyAttendance();
  const color = useStatusColor();
  const { colors } = useTheme();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [filter, setFilter] = useState<'all' | AttendanceStatus>('all');

  const rows = (q.data ?? []).filter((a) => a.course_id === courseId).sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  const shown = rows.filter((r) => filter === 'all' || r.status === filter);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppText variant="heading">{subjectName}</AppText>
      <ChipFilter
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Бүгд', count: rows.length },
          ...ATTENDANCE_ORDER.map((s) => ({ value: s, label: ATTENDANCE_LABEL[s], count: rows.filter((r) => r.status === s).length })),
        ]}
      />
      <QueryView query={q}>
        {() => (
          <Card padded={false} style={styles.card}>
            {shown.length ? (
              shown.map((r, i) => (
                <View key={r.id} style={[styles.row, i < shown.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <AppText mono weight="600" style={styles.date}>
                    {shortDate(r.attendance_date)}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.flex}>
                    {dayLabelOf(r.attendance_date)}
                    {r.note ? ` · ${r.note}` : ''}
                  </AppText>
                  <View style={[styles.pill, { borderColor: color(r.status) }]}>
                    <AppText variant="caption" weight="600" style={{ color: color(r.status) }}>
                      {ATTENDANCE_LABEL[r.status]}
                    </AppText>
                  </View>
                </View>
              ))
            ) : (
              <AppText tone="muted" center style={styles.empty}>
                Бүртгэл алга
              </AppText>
            )}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  date: { width: 52 },
  flex: { flex: 1 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  empty: { paddingVertical: spacing.xl },
});
