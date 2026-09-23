import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Card, ChipFilter, QueryView, Screen, SearchBar } from '../../components';
import { MaterialItem } from '../common/MaterialItem';
import { useMyMaterials } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';

/** §19 Бүх хичээлийн нийтлэгдсэн материал — хайх, хичээлээр шүүх */
export function MaterialsScreen({ route }: AppScreenProps<'Materials'>) {
  const q = useMyMaterials();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState<string>(route.params?.courseId ?? 'all');

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    (q.data ?? []).forEach((m) => map.set(m.course_id, m.subject_name ?? '—'));
    return [...map.entries()];
  }, [q.data]);

  const s = search.trim().toLowerCase();
  const rows = (q.data ?? [])
    .filter((m) => course === 'all' || m.course_id === course)
    .filter((m) => !s || m.title.toLowerCase().includes(s) || m.file_name.toLowerCase().includes(s) || (m.description ?? '').toLowerCase().includes(s));

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <SearchBar value={search} onChange={setSearch} placeholder="Материал хайх..." />
      {courses.length > 1 ? (
        <ChipFilter value={course} onChange={setCourse} options={[{ value: 'all', label: 'Бүгд' }, ...courses.map(([id, name]) => ({ value: id, label: name }))]} />
      ) : null}
      <QueryView query={q} isEmpty={(d) => d.length === 0} emptyIcon="folder-open-outline" emptyTitle="Материал оруулаагүй байна.">
        {() => (
          <Card padded={false} style={styles.card}>
            {rows.length ? (
              rows.map((m) => <MaterialItem key={m.id} m={m} showCourse={course === 'all'} />)
            ) : (
              <AppText tone="muted" center style={styles.empty}>
                Хайлтад тохирох материал алга
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
  empty: { paddingVertical: spacing.xl },
});
