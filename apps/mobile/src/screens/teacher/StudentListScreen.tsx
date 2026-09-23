import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText, Avatar, Badge, EmptyState, ErrorState, OfflineBanner, SearchBar, SkeletonList } from '../../components';
import { useEnrollments } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { radius, spacing, useTheme } from '../../theme';
import { GRADE_STATUS_LABEL } from '../../utils/constants';

/** §29 Хичээлийн оюутны жагсаалт, §49 оюутан хайх */
export function StudentListScreen({ route }: AppScreenProps<'StudentList'>) {
  const { colors } = useTheme();
  const q = useEnrollments(route.params.courseId);
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [search, setSearch] = useState('');

  const s = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter((e) => e.status !== 'dropped').filter((e) => !s || `${e.student_name} ${e.student_code}`.toLowerCase().includes(s));

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <FlatList
        data={rows}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        initialNumToRender={20}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchBar value={search} onChange={setSearch} placeholder="Нэр, оюутны код..." />
            <AppText variant="caption" tone="muted">
              {rows.length} оюутан
            </AppText>
          </View>
        }
        ListEmptyComponent={
          q.isLoading ? <SkeletonList /> : q.isError && !q.data ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : <EmptyState icon="people-outline" title="Оюутан олдсонгүй" />
        }
        renderItem={({ item: e, index }) => (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="caption" tone="faint" style={styles.index}>
              {index + 1}
            </AppText>
            <Avatar name={e.student_name} size={36} />
            <View style={styles.flex}>
              <AppText weight="600" numberOfLines={1}>
                {e.student_name}
              </AppText>
              <AppText variant="caption" tone="muted" mono>
                {e.student_code}
              </AppText>
            </View>
            <View style={styles.right}>
              {e.total_score !== null ? (
                <AppText weight="700" tone="accent">
                  {e.total_score} {e.letter_grade ?? ''}
                </AppText>
              ) : null}
              <Badge label={GRADE_STATUS_LABEL[e.grade_status]} tone={e.grade_status === 'approved' ? 'success' : e.grade_status === 'rejected' ? 'danger' : 'neutral'} />
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  index: { width: 20, textAlign: 'right' },
  right: { alignItems: 'flex-end', gap: 4 },
});
