import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card, EmptyState, InfoRow, ProgressBar, Screen, Section, SkeletonList } from '../../components';
import { MaterialItem } from '../common/MaterialItem';
import { SessionCard } from '../common/ScheduleScreen';
import { useCourseMaterials, useMyAttendance, useMyGrades, useSchedules } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';
import { COURSE_STATUS_LABEL, GRADE_STATUS_LABEL } from '../../utils/constants';
import { attendanceRate } from '../../utils/gpa';

/** §9 Хичээлийн дэлгэрэнгүй: хуваарь, материал, ирц, дүн */
export function CourseDetailScreen({ route, navigation }: AppScreenProps<'CourseDetail'>) {
  const { course } = route.params;
  const schedules = useSchedules(course.id);
  const materials = useCourseMaterials(course.id);
  const attendance = useMyAttendance();
  const grades = useMyGrades();
  const { refreshing, onRefresh } = useRefresh(schedules.refetch, materials.refetch, attendance.refetch, grades.refetch);

  const att = (attendance.data ?? []).filter((a) => a.course_id === course.id);
  const rate = attendanceRate(att);
  const grade = (grades.data ?? []).find((g) => g.course_id === course.id);
  const progress = grade?.progress;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Card>
        <AppText variant="title">{course.subject_name}</AppText>
        <View style={styles.badges}>
          <Badge label={course.subject_code ?? '—'} tone="accent" />
          <Badge label={COURSE_STATUS_LABEL[course.status]} tone={course.status === 'active' ? 'success' : 'neutral'} />
        </View>
        <InfoRow label="Кредит" value={course.credit} />
        <InfoRow label="Багш" value={course.teacher_name ?? 'Томилогдоогүй'} />
        <InfoRow label="Анги" value={course.class_name} />
        <InfoRow label="Улирал" value={course.semester_name} last />
      </Card>

      <Section title="Хуваарь">
        {schedules.isLoading ? (
          <SkeletonList rows={2} />
        ) : (schedules.data ?? []).length ? (
          (schedules.data ?? []).map((s) => <SessionCard key={s.id} s={s} />)
        ) : (
          <Card>
            <EmptyState icon="calendar-outline" title="Хуваарь оруулаагүй байна" />
          </Card>
        )}
      </Section>

      <Section title="Ирц" action="Дэлгэрэнгүй" onAction={() => navigation.navigate('AttendanceDetail', { courseId: course.id, subjectName: course.subject_name ?? '' })}>
        <Card>
          <View style={styles.between}>
            <AppText tone="muted">{att.length} хичээл бүртгэгдсэн</AppText>
            <AppText variant="heading" tone={rate >= 80 || !att.length ? 'success' : 'warn'}>
              {att.length ? `${rate}%` : '—'}
            </AppText>
          </View>
          <ProgressBar value={rate} tone={rate >= 80 ? 'success' : 'warn'} />
        </Card>
      </Section>

      <Section title="Дүн" action="Бүх дүн" onAction={() => navigation.navigate('Grades')}>
        <Card>
          {grade ? (
            <>
              <View style={styles.between}>
                <Badge label={GRADE_STATUS_LABEL[grade.grade_status]} tone={grade.grade_status === 'approved' ? 'success' : 'neutral'} />
                {grade.grade_status === 'approved' ? (
                  <AppText variant="title" tone="accent">
                    {grade.letter_grade} · {grade.total_score}
                  </AppText>
                ) : null}
              </View>
              {progress?.items.map((i, idx) => (
                <InfoRow key={i.id} label={i.name} value={i.score === null ? '—' : `${i.score}/${i.max_score}`} last={idx === progress.items.length - 1} />
              ))}
              {grade.grade_status !== 'approved' ? (
                <AppText variant="caption" tone="faint">
                  Эцсийн дүн Сургалтын алба баталгаажуулсны дараа харагдана.
                </AppText>
              ) : null}
            </>
          ) : (
            <AppText tone="muted">Дүнгийн мэдээлэл алга</AppText>
          )}
        </Card>
      </Section>

      <Section title="Материал">
        <Card padded={false} style={styles.listCard}>
          {materials.isLoading ? (
            <SkeletonList rows={2} />
          ) : (materials.data ?? []).length ? (
            (materials.data ?? []).map((m) => <MaterialItem key={m.id} m={m} />)
          ) : (
            <EmptyState icon="folder-open-outline" title="Энэ хичээлд материал оруулаагүй байна." />
          )}
        </Card>
        {(materials.data ?? []).length > 3 ? (
          <Button title="Бүх материал" variant="secondary" onPress={() => navigation.navigate('Materials', { courseId: course.id, title: course.subject_name })} />
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  listCard: { paddingHorizontal: spacing.lg },
});
