import { StyleSheet, View } from 'react-native';
import { AppText, Card, EmptyState, ProgressBar, Screen, Section, StatGrid, StatTile } from '../../components';
import { useMyGrades, useStudentSummary } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { spacing } from '../../theme';
import { gpa } from '../../utils/format';
import { semesterBreakdown } from '../../utils/gpa';

/** §15 Улирлын болон нийт GPA */
export function GPAScreen() {
  const summary = useStudentSummary();
  const grades = useMyGrades();
  const { refreshing, onRefresh } = useRefresh(summary.refetch, grades.refetch);
  const semesters = semesterBreakdown(grades.data ?? []);
  const totalCredits = semesters.reduce((s, r) => s + r.credits, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <StatGrid>
        <StatTile label="Нийт GPA" value={gpa(summary.data?.gpa)} icon="school-outline" />
        <StatTile label="Нийт кредит" value={String(summary.data?.earned_credits ?? totalCredits)} icon="layers-outline" tone="gold" />
      </StatGrid>

      <Section title="Улирал тус бүрээр">
        {semesters.length ? (
          semesters.map((s) => (
            <Card key={s.semester}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <AppText variant="heading">{s.semester}</AppText>
                  <AppText variant="caption" tone="muted">
                    {s.courses} хичээл · {s.credits} кредит
                  </AppText>
                </View>
                <AppText variant="title" tone="accent">
                  {gpa(s.gpa)}
                </AppText>
              </View>
              <ProgressBar value={s.gpa ?? 0} max={4} tone={(s.gpa ?? 0) >= 3 ? 'success' : (s.gpa ?? 0) >= 2 ? 'accent' : 'warn'} />
            </Card>
          ))
        ) : (
          <Card>
            <EmptyState icon="stats-chart-outline" title="Баталгаажсан дүн алга" message="GPA нь Сургалтын алба баталгаажуулсан дүнгээр бодогдоно." />
          </Card>
        )}
      </Section>
      <AppText variant="small" tone="faint" center>
        GPA = Σ(кредит × голч оноо) / Σ кредит · 4.0 оноот систем
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  flex: { flex: 1 },
});
