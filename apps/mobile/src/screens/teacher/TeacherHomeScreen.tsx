import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Badge, Button, Card, EmptyState, ListItem, Screen, Section, Skeleton, StatGrid, StatTile } from '../../components';
import { CountdownCard } from '../common/CountdownCard';
import { SessionCard } from '../common/ScheduleScreen';
import { CancelClassSheet } from './CancelClassSheet';
import type { Schedule } from '../../types/models';
import { useNotifications, useTeacherDashboard } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { TabScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/auth.store';
import { radius, spacing, useTheme } from '../../theme';
import { DAY_LABEL } from '../../utils/constants';
import { relative, shortName } from '../../utils/format';

/** §26 Багшийн Dashboard */
export function TeacherHomeScreen({ navigation }: TabScreenProps<'HomeTab'>) {
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const dash = useTeacherDashboard();
  const notifications = useNotifications();
  const { refreshing, onRefresh } = useRefresh(dash.refetch, notifications.refetch);
  /** Хичээлийн цаг дээр дарахад гарах "Өнөөдөр хичээл орохгүй" цонх */
  const [cancelTarget, setCancelTarget] = useState<Schedule | null>(null);
  const d = dash.data;
  const unread = (notifications.data ?? []).filter((n) => n.user_id && !n.is_read).slice(0, 3);
  const gradeTodo = d ? d.grades.draft_courses + d.grades.rejected_courses : 0;
  const name = shortName(profile?.user.full_name, profile?.user.last_name, profile?.user.first_name);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.hello}>
        <Avatar name={profile?.user.full_name} uri={profile?.user.avatar_url} size={52} />
        <View style={styles.flex}>
          <AppText variant="title" numberOfLines={1}>
            Сайн байна уу, {name} багш!
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {profile?.employee?.department_name ?? profile?.employee?.position ?? 'Багш'}
          </AppText>
        </View>
      </View>

      {d ? (
        <StatGrid>
          <StatTile label="Өнөөдрийн хичээл" value={String(d.today.length)} icon="today-outline" onPress={() => navigation.navigate('ScheduleTab')} />
          <StatTile label="Нийт оюутан" value={String(d.student_count)} icon="people-outline" tone="gold" hint={`${d.course_count} хичээл`} onPress={() => navigation.navigate('CoursesTab')} />
          <StatTile label="Ирц бүртгэх" value={String(d.attendance_pending)} icon="checkmark-done-outline" tone={d.attendance_pending ? 'warn' : 'success'} />
          <StatTile label="Илгээх дүн" value={String(gradeTodo)} icon="ribbon-outline" tone={d.grades.rejected_courses ? 'danger' : gradeTodo ? 'warn' : 'success'} hint={d.grades.submitted_courses ? `${d.grades.submitted_courses} хянагдаж буй` : undefined} />
        </StatGrid>
      ) : (
        <StatGrid>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={108} style={{ flexBasis: '47%', flexGrow: 1, borderRadius: radius.lg }} />
          ))}
        </StatGrid>
      )}

      {d && d.grades.rejected_courses > 0 ? (
        <Card tone="danger">
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <AppText tone="danger" style={styles.flex}>
              {d.grades.rejected_courses} хичээлийн дүн Сургалтын албанаас буцаагдсан. Засаад дахин илгээнэ үү.
            </AppText>
          </View>
        </Card>
      ) : null}

      <Section title={`Өнөөдөр · ${DAY_LABEL[d?.day_of_week ?? 1] ?? ''}`} action="Хуваарь" onAction={() => navigation.navigate('ScheduleTab')}>
        {!d ? (
          <Skeleton height={92} style={{ borderRadius: radius.lg }} />
        ) : d.today.length ? (
          d.today.map((s) => (
            <View key={s.id} style={styles.session}>
              <SessionCard s={s} teacherView forDate={d.date} onPress={() => setCancelTarget(s)} />
              {s.cancelled_today ? (
                <Button size="sm" variant="secondary" icon="close-circle-outline" title="Цуцлагдсан · дэлгэрэнгүй" onPress={() => setCancelTarget(s)} />
              ) : (
                <Button
                  size="sm"
                  variant={s.attendance_taken ? 'secondary' : 'primary'}
                  icon={s.attendance_taken ? 'checkmark-circle' : 'create-outline'}
                  title={s.attendance_taken ? 'Ирц бүртгэгдсэн · засах' : 'Ирц бүртгэх'}
                  onPress={() => navigation.navigate('AttendanceEntry', { courseId: s.course_id, title: s.subject_name, date: d.date })}
                />
              )}
            </View>
          ))
        ) : (
          <Card>
            <EmptyState icon="cafe-outline" title="Өнөөдөр хичээлгүй" />
          </Card>
        )}
      </Section>

      <CountdownCard />

      <View style={styles.quick}>
        {[
          { label: 'Миний хичээл', icon: 'book-outline' as const, go: () => navigation.navigate('CoursesTab') },
          { label: 'Хичээлийн цаг', icon: 'time-outline' as const, go: () => navigation.navigate('Workload') },
          { label: 'Статистик', icon: 'bar-chart-outline' as const, go: () => navigation.navigate('Statistics') },
          { label: 'Шалгалт', icon: 'calendar-outline' as const, go: () => navigation.navigate('Exams') },
          { label: 'Зарлал', icon: 'megaphone-outline' as const, go: () => navigation.navigate('Announcements') },
        ].map((m) => (
          <Pressable key={m.label} onPress={m.go} style={({ pressed }) => [styles.quickItem, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Ionicons name={m.icon} size={22} color={colors.accent} />
            <AppText variant="caption" weight="600" center>
              {m.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Section title="Миний хичээл" action="Бүгд" onAction={() => navigation.navigate('CoursesTab')}>
        <Card padded={false} style={styles.listCard}>
          {(d?.courses ?? []).slice(0, 4).map((c, i, arr) => (
            <ListItem
              key={c.id}
              title={c.subject_name ?? '—'}
              subtitle={`${c.class_name ?? '—'} · ${c.student_count ?? 0} оюутан`}
              icon="book-outline"
              divider={i < arr.length - 1}
              onPress={() => navigation.navigate('TeacherCourseDetail', { courseId: c.id, title: c.subject_name })}
            />
          ))}
          {d && !d.courses.length ? <EmptyState icon="book-outline" title="Энэ улиралд оноогдсон хичээл алга" /> : null}
        </Card>
      </Section>

      <Section title="Мэдэгдэл" action="Бүгд" onAction={() => navigation.navigate('NotificationsTab')}>
        <Card padded={false} style={styles.listCard}>
          {unread.length ? (
            unread.map((n, i) => (
              <ListItem key={n.id} title={n.title} subtitle={n.message} meta={relative(n.created_at)} unread divider={i < unread.length - 1} onPress={() => navigation.navigate('NotificationsTab')} />
            ))
          ) : (
            <EmptyState icon="notifications-outline" title="Шинэ мэдэгдэл алга" />
          )}
        </Card>
      </Section>
      {d?.grades.submitted_courses ? <Badge label={`${d.grades.submitted_courses} хичээлийн дүн хянагдаж байна`} tone="accent" /> : null}
      <CancelClassSheet visible={!!cancelTarget} onClose={() => setCancelTarget(null)} session={cancelTarget} targetDate={d?.date} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hello: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  session: { gap: spacing.sm },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickItem: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1, minHeight: 72, justifyContent: 'center' },
  listCard: { paddingHorizontal: spacing.lg },
});
