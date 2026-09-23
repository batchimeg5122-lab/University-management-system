import { useQueries } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { gradeApi } from '../../api/grade.api';
import { AppText, Card, EmptyState, ProgressBar, QueryView, Screen, SkeletonCards, StatGrid, StatTile } from '../../components';
import { qk, useCourseStats, useCourses, useCurrentSemester } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { radius, spacing, useTheme } from '../../theme';
import type { AttendanceStatus, CourseStats, LetterBucket } from '../../types/models';
import { ATTENDANCE_LABEL } from '../../utils/constants';
import { percent } from '../../utils/format';

const BUCKETS: LetterBucket[] = ['A', 'B', 'C', 'D', 'F'];

function Distribution({ stats }: { stats: CourseStats }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...BUCKETS.map((b) => stats.distribution[b] ?? 0));
  const tone = { A: colors.success, B: colors.accent, C: colors.gold, D: colors.warn, F: colors.danger };
  return (
    <View style={styles.bars} accessibilityLabel="Дүнгийн тархалт">
      {BUCKETS.map((b) => {
        const n = stats.distribution[b] ?? 0;
        return (
          <View key={b} style={styles.barCol}>
            <AppText variant="caption" weight="600">
              {n}
            </AppText>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
              <View style={{ height: `${(n / max) * 100}%`, backgroundColor: tone[b], borderRadius: radius.sm }} />
            </View>
            <AppText variant="caption" tone="muted" weight="700">
              {b}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function CourseStatsView({ courseId }: { courseId: string }) {
  const q = useCourseStats(courseId);
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <QueryView query={q} skeleton={<SkeletonCards />}>
        {(s) => {
          const attTotal = Object.values(s.attendance_by_status).reduce((a, b) => a + b, 0);
          return (
            <>
              <StatGrid>
                <StatTile label="Нийт оюутан" value={String(s.student_count)} icon="people-outline" />
                <StatTile label="Ирцийн дундаж" value={percent(s.avg_attendance, 1)} icon="checkmark-done-outline" tone={s.avg_attendance >= 80 ? 'success' : 'warn'} />
                <StatTile label="Дундаж дүн" value={String(s.avg_score)} icon="ribbon-outline" tone="gold" />
                <StatTile label="Дүнтэй" value={`${s.graded_count}/${s.student_count}`} icon="document-text-outline" tone="accent" />
              </StatGrid>
              <Card>
                <AppText variant="heading" style={styles.mb}>
                  Дүнгийн тархалт
                </AppText>
                {s.graded_count ? <Distribution stats={s} /> : <EmptyState icon="bar-chart-outline" title="Эцсийн дүн гараагүй байна" />}
              </Card>
              <Card>
                <AppText variant="heading" style={styles.mb}>
                  Ирцийн бүтэц
                </AppText>
                {attTotal ? (
                  (Object.keys(ATTENDANCE_LABEL) as AttendanceStatus[]).map((st) => {
                    const n = s.attendance_by_status[st] ?? 0;
                    return (
                      <View key={st} style={styles.attRow}>
                        <AppText variant="caption" style={styles.attLabel}>
                          {ATTENDANCE_LABEL[st]}
                        </AppText>
                        <View style={styles.flex}>
                          <ProgressBar value={n} max={attTotal} tone={st === 'present' ? 'success' : st === 'absent' ? 'danger' : st === 'late' ? 'warn' : 'accent'} />
                        </View>
                        <AppText variant="caption" mono style={styles.attN}>
                          {n}
                        </AppText>
                      </View>
                    );
                  })
                ) : (
                  <EmptyState icon="checkmark-done-outline" title="Ирц бүртгээгүй байна" />
                )}
              </Card>
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

/** §34 Багшийн статистик — нэг хичээл эсвэл бүх хичээлийн тойм */
export function StatisticsScreen({ route, navigation }: AppScreenProps<'Statistics'>) {
  const courseId = route.params?.courseId;
  const courses = useCourses();
  const semester = useCurrentSemester();
  const list = (courses.data ?? []).filter((c) => !semester.data || c.semester_id === semester.data.id);
  const stats = useQueries({
    queries: courseId ? [] : list.map((c) => ({ queryKey: qk.courseStats(c.id), queryFn: () => gradeApi.courseStats(c.id) })),
  });
  const { refreshing, onRefresh } = useRefresh(courses.refetch, ...stats.map((s) => s.refetch));

  if (courseId) return <CourseStatsView courseId={courseId} />;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <QueryView query={courses} isEmpty={() => list.length === 0} emptyIcon="bar-chart-outline" emptyTitle="Хичээл алга">
        {() =>
          list.map((c, i) => {
            const s = stats[i]?.data;
            return (
              <Card key={c.id} onPress={() => navigation.push('Statistics', { courseId: c.id, title: c.subject_name })}>
                <AppText variant="heading">{c.subject_name}</AppText>
                <AppText variant="caption" tone="muted">
                  {c.class_name} · {c.student_count ?? 0} оюутан
                </AppText>
                {s ? (
                  <View style={styles.summary}>
                    <AppText variant="caption">Ирц: {percent(s.avg_attendance, 1)}</AppText>
                    <AppText variant="caption">Дундаж: {s.avg_score}</AppText>
                    <AppText variant="caption" tone="muted">
                      {BUCKETS.map((b) => `${b}:${s.distribution[b] ?? 0}`).join(' ')}
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="small" tone="faint">
                    Ачаалж байна...
                  </AppText>
                )}
              </Card>
            );
          })
        }
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mb: { marginBottom: spacing.md },
  bars: { flexDirection: 'row', gap: spacing.md, height: 160, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', flex: 1, borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  attLabel: { width: 72 },
  attN: { width: 36, textAlign: 'right' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
});
