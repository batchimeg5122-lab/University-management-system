import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, QueryView, Screen, SearchBar, SkeletonCards } from '../../components';
import { useCourses, useCurrentSemester } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { TabScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';
import { COURSE_STATUS_LABEL } from '../../utils/constants';

/** §28 Багшид оноогдсон хичээлүүд */
export function TeacherCoursesScreen({ navigation }: TabScreenProps<'CoursesTab'>) {
  const q = useCourses();
  const semester = useCurrentSemester();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const s = search.trim().toLowerCase();
  const rows = (q.data ?? [])
    .filter((c) => showAll || !semester.data || c.semester_id === semester.data.id)
    .filter((c) => !s || `${c.subject_name} ${c.subject_code} ${c.class_name}`.toLowerCase().includes(s))
    .sort((a, b) => (a.subject_name ?? '').localeCompare(b.subject_name ?? ''));

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <SearchBar value={search} onChange={setSearch} placeholder="Хичээл, анги хайх..." />
      <QueryView query={q} skeleton={<SkeletonCards count={4} />} isEmpty={(d) => d.length === 0} emptyIcon="book-outline" emptyTitle="Танд оноогдсон хичээл алга">
        {() => (
          <View style={styles.list}>
            {rows.map((c) => (
              <Card key={c.id} onPress={() => navigation.navigate('TeacherCourseDetail', { courseId: c.id, title: c.subject_name })}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <AppText variant="heading" numberOfLines={2}>
                      {c.subject_name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {c.subject_code} · {c.credit ?? 0} кредит
                    </AppText>
                  </View>
                  <Badge label={COURSE_STATUS_LABEL[c.status]} tone={c.status === 'active' ? 'success' : 'neutral'} />
                </View>
                <View style={styles.meta}>
                  <Badge label={c.class_name ?? '—'} tone="accent" />
                  <AppText variant="caption" tone="textSoft">
                    {c.student_count ?? 0} оюутан
                  </AppText>
                  {showAll ? (
                    <AppText variant="small" tone="faint">
                      {c.semester_name}
                    </AppText>
                  ) : null}
                </View>
              </Card>
            ))}
            <AppText variant="caption" tone="accent" weight="600" center onPress={() => setShowAll((v) => !v)} style={styles.toggle}>
              {showAll ? 'Зөвхөн энэ улирал' : 'Өмнөх улирлуудыг харах'}
            </AppText>
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  toggle: { paddingVertical: spacing.md },
});
