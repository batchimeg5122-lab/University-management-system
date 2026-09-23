import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Badge, Card, EmptyState, ListItem, Screen, Section, Skeleton, StatGrid, StatTile } from '../../components';
import { CountdownCard } from '../common/CountdownCard';
import { SessionCard } from '../common/ScheduleScreen';
import { useMyGrades, useNotifications, useSchedules, useStudentSummary } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppStackParamList, TabScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/auth.store';
import { radius, spacing, useTheme } from '../../theme';
import { DAY_LABEL } from '../../utils/constants';
import { gpa, money, percent, relative, weekday } from '../../utils/format';

type MenuItem = { label: string; icon: keyof typeof Ionicons.glyphMap; route: keyof AppStackParamList };

const MENU: MenuItem[] = [
  { label: 'Ирц', icon: 'checkmark-done-outline', route: 'Attendance' },
  { label: 'Дүн', icon: 'ribbon-outline', route: 'Grades' },
  { label: 'GPA', icon: 'stats-chart-outline', route: 'GPA' },
  { label: 'Санхүү', icon: 'wallet-outline', route: 'Finance' },
  { label: 'Материал', icon: 'folder-open-outline', route: 'Materials' },
  { label: 'Тодорхойлолт', icon: 'document-text-outline', route: 'Certificates' },
  { label: 'Зарлал', icon: 'megaphone-outline', route: 'Announcements' },
  { label: 'Үнэмлэх', icon: 'id-card-outline', route: 'StudentCard' },
];

/** §6 Оюутны Home Dashboard */
export function StudentHomeScreen({ navigation }: TabScreenProps<'HomeTab'>) {
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const summary = useStudentSummary();
  const schedules = useSchedules();
  const notifications = useNotifications();
  const grades = useMyGrades();
  const { refreshing, onRefresh } = useRefresh(summary.refetch, schedules.refetch, notifications.refetch, grades.refetch);

  const today = weekday();
  const todayClasses = (schedules.data ?? []).filter((s) => s.day_of_week === today).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const unread = (notifications.data ?? []).filter((n) => n.user_id && !n.is_read).slice(0, 3);
  const recentGrades = (grades.data ?? [])
    .filter((g) => g.grade_status === 'approved')
    .sort((a, b) => (b.approved_at ?? '').localeCompare(a.approved_at ?? ''))
    .slice(0, 3);
  const s = summary.data;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.hello}>
        <Avatar name={profile?.user.full_name} uri={profile?.user.avatar_url} size={52} />
        <View style={styles.flex}>
          <AppText variant="caption" tone="muted">
            Сайн байна уу,
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {profile?.user.first_name ?? profile?.user.full_name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {profile?.student?.student_code} · {profile?.student?.class_name ?? '—'}
          </AppText>
        </View>
      </View>

      {s ? (
        <StatGrid>
          <StatTile label="Нийт GPA" value={gpa(s.gpa)} icon="school-outline" hint={s.semester_gpa !== null ? `Улирал: ${gpa(s.semester_gpa)}` : undefined} onPress={() => navigation.navigate('GPA')} />
          <StatTile label="Нийт кредит" value={String(s.earned_credits)} icon="layers-outline" tone="gold" hint={`${s.course_count} хичээл энэ улиралд`} />
          <StatTile label="Ирц" value={percent(s.attendance_rate, 1)} icon="checkmark-done-outline" tone={s.attendance_rate >= 80 ? 'success' : 'warn'} onPress={() => navigation.navigate('Attendance')} />
          <StatTile label="Төлбөрийн үлдэгдэл" value={money(s.balance)} icon="wallet-outline" tone={s.balance > 0 ? 'danger' : 'success'} onPress={() => navigation.navigate('Finance')} />
        </StatGrid>
      ) : (
        <StatGrid>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={108} style={{ flexBasis: '47%', flexGrow: 1, borderRadius: radius.lg }} />
          ))}
        </StatGrid>
      )}

      <CountdownCard />

      <View style={styles.menu}>
        {MENU.map((m) => (
          <Pressable
            key={m.label}
            onPress={() => navigation.navigate(m.route as never)}
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={m.label}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name={m.icon} size={22} color={colors.accent} />
            </View>
            <AppText variant="small" weight="600" center numberOfLines={2}>
              {m.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Section title={`Өнөөдрийн хичээл · ${DAY_LABEL[today]}`} action="Хуваарь" onAction={() => navigation.navigate('ScheduleTab')}>
        {schedules.isLoading ? (
          <Skeleton height={92} style={{ borderRadius: radius.lg }} />
        ) : todayClasses.length ? (
          todayClasses.map((c) => <SessionCard key={c.id} s={c} />)
        ) : (
          <Card>
            <EmptyState icon="cafe-outline" title="Өнөөдөр хичээлгүй" />
          </Card>
        )}
      </Section>

      <Section title="Шинэ мэдэгдэл" action="Бүгд" onAction={() => navigation.navigate('NotificationsTab')}>
        <Card padded={false} style={styles.listCard}>
          {unread.length ? (
            unread.map((n, i) => (
              <ListItem
                key={n.id}
                title={n.title}
                subtitle={n.message}
                meta={relative(n.created_at)}
                unread
                divider={i < unread.length - 1}
                onPress={() => navigation.navigate('NotificationsTab')}
              />
            ))
          ) : (
            <EmptyState icon="notifications-outline" title="Одоогоор танд шинэ мэдэгдэл байхгүй байна." />
          )}
        </Card>
      </Section>

      <Section title="Сүүлийн дүн" action="Бүх дүн" onAction={() => navigation.navigate('Grades')}>
        <Card padded={false} style={styles.listCard}>
          {recentGrades.length ? (
            recentGrades.map((g, i) => (
              <ListItem
                key={g.id}
                title={g.subject_name ?? '—'}
                subtitle={`${g.credit ?? 0} кредит · ${g.semester_name ?? ''}`}
                divider={i < recentGrades.length - 1}
                right={
                  <View style={styles.gradeRight}>
                    <AppText variant="heading" tone="accent">
                      {g.letter_grade}
                    </AppText>
                    <Badge label={`${g.total_score ?? '—'} оноо`} />
                  </View>
                }
              />
            ))
          ) : (
            <EmptyState icon="ribbon-outline" title="Баталгаажсан дүн алга" />
          )}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hello: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menu: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  menuItem: { width: '25%', alignItems: 'center', gap: 6, minHeight: 76 },
  menuIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  listCard: { paddingHorizontal: spacing.lg },
  gradeRight: { alignItems: 'flex-end', gap: 4 },
});
