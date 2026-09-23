import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, ProgressBar, QueryView, Screen, SkeletonCards } from '../../components';
import { useMyAttendance } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { spacing, useTheme } from '../../theme';
import type { Attendance, AttendanceStatus } from '../../types/models';
import { ATTENDANCE_LABEL, ATTENDANCE_ORDER } from '../../utils/constants';
import { attendanceRate } from '../../utils/gpa';

export function useStatusColor() {
  const { colors } = useTheme();
  return (s: AttendanceStatus) =>
    ({ present: colors.success, absent: colors.danger, late: colors.warn, sick: colors.gold, excused: colors.accent })[s];
}

/** §12 Хичээл тус бүрийн ирцийн нэгтгэл */
export function AttendanceScreen({ navigation }: AppScreenProps<'Attendance'>) {
  const q = useMyAttendance();
  const color = useStatusColor();
  const { refreshing, onRefresh } = useRefresh(q.refetch);

  const groups = useMemo(() => {
    const map = new Map<string, { courseId: string; name: string; rows: Attendance[] }>();
    (q.data ?? []).forEach((a) => {
      const g = map.get(a.course_id) ?? { courseId: a.course_id, name: a.subject_name ?? '—', rows: [] };
      g.rows.push(a);
      map.set(a.course_id, g);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [q.data]);

  const total = attendanceRate(q.data ?? []);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <QueryView query={q} skeleton={<SkeletonCards />} isEmpty={(d) => d.length === 0} emptyIcon="checkmark-done-outline" emptyTitle="Ирцийн бүртгэл алга">
        {() => (
          <>
            <Card tone="accent">
              <AppText variant="caption" tone="muted">
                Нийт ирц
              </AppText>
              <AppText variant="display" tone="accent">
                {total}%
              </AppText>
              <ProgressBar value={total} tone={total >= 80 ? 'success' : 'warn'} />
              {total < 80 ? (
                <AppText variant="caption" tone="warn" style={styles.warn}>
                  Анхааруулга: ирц 80%-иас доош байна.
                </AppText>
              ) : null}
            </Card>
            {groups.map((g) => {
              const count = (s: AttendanceStatus) => g.rows.filter((r) => r.status === s).length;
              const rate = attendanceRate(g.rows);
              return (
                <Card key={g.courseId} onPress={() => navigation.navigate('AttendanceDetail', { courseId: g.courseId, subjectName: g.name })}>
                  <View style={styles.between}>
                    <AppText variant="heading" style={styles.flex} numberOfLines={2}>
                      {g.name}
                    </AppText>
                    <AppText variant="title" tone={rate >= 80 ? 'success' : 'warn'}>
                      {rate}%
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="muted">
                    Нийт хичээл: {g.rows.length}
                  </AppText>
                  <View style={styles.counts}>
                    {ATTENDANCE_ORDER.map((s) =>
                      count(s) ? (
                        <View key={s} style={styles.count}>
                          <View style={[styles.dot, { backgroundColor: color(s) }]} />
                          <AppText variant="caption">
                            {ATTENDANCE_LABEL[s]}: {count(s)}
                          </AppText>
                        </View>
                      ) : null,
                    )}
                  </View>
                  <ProgressBar value={rate} tone={rate >= 80 ? 'success' : 'warn'} height={6} />
                </Card>
              );
            })}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginVertical: spacing.sm },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  warn: { marginTop: spacing.sm },
});
