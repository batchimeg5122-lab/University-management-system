import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, ChipFilter, QueryView, Screen, SearchBar, SkeletonCards } from '../../components';
import { useCourses, useCurrentSemester } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { TabScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';
import { COURSE_STATUS_LABEL } from '../../utils/constants';

/** §9 Миний хичээл — улирлаар шүүх, хайх */
export function StudentCoursesScreen({ navigation }: TabScreenProps<'CoursesTab'>) {
  const q = useCourses();
  const semester = useCurrentSemester();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [search, setSearch] = useState('');
  const [sem, setSem] = useState<string>('current');

  const semesters = useMemo(() => {
    const map = new Map<string, string>();
    (q.data ?? []).forEach((c) => map.set(c.semester_id, c.semester_name ?? ''));
    return [...map.entries()].sort((a, b) => b[1].localeCompare(a[1]));
  }, [q.data]);

  const currentId = semester.data?.id;
  const filtered = (q.data ?? [])
    .filter((c) => (sem === 'all' ? true : sem === 'current' ? (currentId ? c.semester_id === currentId : true) : c.semester_id === sem))
    .filter((c) => {
      const s = search.trim().toLowerCase();
      return !s || (c.subject_name ?? '').toLowerCase().includes(s) || (c.subject_code ?? '').toLowerCase().includes(s);
    });

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <SearchBar value={search} onChange={setSearch} placeholder="Хичээл хайх..." />
      <ChipFilter
        value={sem}
        onChange={setSem}
        options={[{ value: 'current', label: 'Энэ улирал' }, { value: 'all', label: 'Бүгд' }, ...semesters.map(([id, name]) => ({ value: id, label: name }))]}
      />
      <QueryView query={q} skeleton={<SkeletonCards count={4} />}>
        {() =>
          filtered.length ? (
            <View style={styles.list}>
              {filtered.map((c) => (
                <Card key={c.id} onPress={() => navigation.navigate('CourseDetail', { course: c })} accessibilityLabel={c.subject_name}>
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
                  <AppText variant="caption" tone="textSoft" style={styles.teacher}>
                    Багш: {c.teacher_name ?? 'Томилогдоогүй'}
                  </AppText>
                </Card>
              ))}
            </View>
          ) : (
            <Card>
              <AppText tone="muted" center>
                {search ? 'Хайлтад тохирох хичээл алга' : 'Энэ улиралд бүртгэлтэй хичээл алга'}
              </AppText>
            </Card>
          )
        }
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  teacher: { marginTop: spacing.sm },
});
