import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';
import { courseApi } from '../../api/course.api';
import { AppText, Badge, Card, EmptyState, InfoRow, QueryView, Screen, Section, SkeletonList } from '../../components';
import { SessionCard } from '../common/ScheduleScreen';
import { useEnrollments, useSchedules } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps, AppStackParamList } from '../../navigation/types';
import { radius, spacing, useTheme } from '../../theme';
import type { GradeStatus } from '../../types/models';
import { COURSE_STATUS_LABEL, GRADE_STATUS_LABEL } from '../../utils/constants';

/** §29 Хичээлийн дэлгэрэнгүй — оюутан, ирц, дүн, материал, статистик руу */
export function TeacherCourseDetailScreen({ route, navigation }: AppScreenProps<'TeacherCourseDetail'>) {
  const { colors } = useTheme();
  const { courseId } = route.params;
  const course = useQuery({ queryKey: ['course', courseId], queryFn: () => courseApi.detail(courseId) });
  const enrollments = useEnrollments(courseId);
  const schedules = useSchedules(courseId);
  const { refreshing, onRefresh } = useRefresh(course.refetch, enrollments.refetch, schedules.refetch);

  const statusCount = (enrollments.data ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.grade_status] = (acc[e.grade_status] ?? 0) + 1;
    return acc;
  }, {});
  const title = course.data?.subject_name ?? route.params.title;
  const params = { courseId, title };

  const actions: { label: string; icon: keyof typeof Ionicons.glyphMap; route: keyof AppStackParamList; badge?: string }[] = [
    { label: 'Оюутнууд', icon: 'people-outline', route: 'StudentList', badge: String(enrollments.data?.length ?? '') },
    { label: 'Ирц бүртгэх', icon: 'checkmark-done-outline', route: 'AttendanceEntry' },
    { label: 'Дүн оруулах', icon: 'ribbon-outline', route: 'GradeEntry' },
    { label: 'Материал', icon: 'folder-open-outline', route: 'TeacherMaterials' },
    { label: 'Статистик', icon: 'bar-chart-outline', route: 'Statistics' },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <QueryView query={course} skeleton={<SkeletonList rows={3} />}>
        {(c) => (
          <Card>
            <AppText variant="title">{c.subject_name}</AppText>
            <View style={styles.badges}>
              <Badge label={c.subject_code ?? '—'} tone="accent" />
              <Badge label={COURSE_STATUS_LABEL[c.status]} tone={c.status === 'active' ? 'success' : 'neutral'} />
            </View>
            <InfoRow label="Анги" value={c.class_name} />
            <InfoRow label="Оюутан" value={c.student_count} />
            <InfoRow label="Кредит" value={c.credit} />
            <InfoRow label="Улирал" value={c.semester_name} last />
          </Card>
        )}
      </QueryView>

      <View style={styles.grid}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => navigation.navigate(a.route as 'StudentList', params)}
            style={({ pressed }) => [styles.action, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name={a.icon} size={22} color={colors.accent} />
            </View>
            <AppText variant="caption" weight="600" center>
              {a.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Section title="Дүнгийн төлөв">
        <Card>
          <View style={styles.badges}>
            {(Object.keys(statusCount) as GradeStatus[]).map((s) => (
              <Badge
                key={s}
                label={`${GRADE_STATUS_LABEL[s]}: ${statusCount[s]}`}
                tone={s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : s === 'submitted' ? 'accent' : 'neutral'}
              />
            ))}
            {!enrollments.data?.length ? <AppText tone="muted">Оюутан бүртгэгдээгүй</AppText> : null}
          </View>
        </Card>
      </Section>

      <Section title="Хуваарь">
        {(schedules.data ?? []).length ? (
          (schedules.data ?? []).map((s) => <SessionCard key={s.id} s={s} teacherView />)
        ) : (
          <Card>
            <EmptyState icon="calendar-outline" title="Хуваарь оруулаагүй байна" />
          </Card>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, minHeight: 92, justifyContent: 'center' },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
