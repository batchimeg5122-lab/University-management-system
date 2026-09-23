import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, ProgressBar } from '../../components';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useCurrentSemester, useExams, useSchedules } from '../../hooks/queries';
import type { AppStackParamList } from '../../navigation/types';
import { EXAM_TYPE_LABEL } from '../../utils/constants';
import { spacing, useTheme } from '../../theme';
import { DAY_LABEL } from '../../utils/constants';
import { date, isoDate, time, weekday } from '../../utils/format';

const DAY_MS = 86_400_000;

function parse(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(from: Date, to: Date) {
  return Math.round((parse(isoDate(to)).getTime() - parse(isoDate(from)).getTime()) / DAY_MS);
}

function whenLabel(days: number) {
  if (days === 0) return 'Өнөөдөр';
  if (days === 1) return 'Маргааш';
  return `${days} хоногийн дараа`;
}

/**
 * Нүүр дэлгэцийн тоолуур:
 * 1) Хуваарьт "Шалгалт" төрлийн цаг байвал хамгийн ойрын шалгалт
 * 2) Улирал дуусах хүртэлх хоног + явцын шугам
 */
export function CountdownCard() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const semester = useCurrentSemester().data;
  const schedules = useSchedules().data ?? [];
  const exams = useExams(true).data ?? [];
  if (!semester) return null;

  const today = new Date();
  const start = parse(semester.start_date);
  const end = parse(semester.end_date);
  const total = Math.max(1, daysBetween(start, end));
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, today)));
  const left = daysBetween(today, end);

  // Хамгийн ойрын шалгалт (долоо хоног бүрийн хуваариас дараагийн тохиолдлыг олно)
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const weeklyExams = schedules
    .filter((s) => s.session_type === 'exam')
    .map((s) => {
      let diff = (s.day_of_week - weekday(today) + 7) % 7;
      const [h, m] = s.start_time.split(':').map(Number);
      if (diff === 0 && h * 60 + m < nowMinutes) diff = 7;
      return { s, diff, at: new Date(today.getTime() + diff * DAY_MS) };
    })
    .filter((e) => e.at <= new Date(end.getTime() + DAY_MS))
    .sort((a, b) => a.diff - b.diff || a.s.start_time.localeCompare(b.s.start_time));
  const fallback = weeklyExams[0];

  // 1-рт: Сургалтын албаны товлосон тодорхой огноотой шалгалт
  const dated = exams
    .map((e) => {
      const [y, m, d] = e.exam_date.split('-').map(Number);
      const [h, mi] = e.start_time.split(':').map(Number);
      return { e, at: new Date(y, m - 1, d, h, mi) };
    })
    .filter((x) => x.at.getTime() > today.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  const next = dated
    ? {
        diff: daysBetween(today, dated.at),
        subject: dated.e.subject_name,
        label: EXAM_TYPE_LABEL[dated.e.exam_type] ?? 'Шалгалт',
        when: `${date(dated.e.exam_date)} ${time(dated.e.start_time)}`,
        room: dated.e.is_online ? 'Онлайн' : dated.e.room,
        hours: Math.max(0, Math.round((dated.at.getTime() - today.getTime()) / 3_600_000)),
      }
    : fallback
      ? { diff: fallback.diff, subject: fallback.s.subject_name, label: 'Дараагийн шалгалт', when: `${DAY_LABEL[fallback.s.day_of_week]} ${time(fallback.s.start_time)}`, room: fallback.s.room, hours: null as number | null }
      : null;

  if (left < 0) {
    return (
      <Card>
        <AppText tone="muted">
          {semester.academic_year} {semester.name} дууссан ({date(semester.end_date)})
        </AppText>
      </Card>
    );
  }

  return (
    <Card>
      {next ? (
        <Pressable
          onPress={() => navigation.navigate('Exams')}
          accessibilityRole="button"
          style={[styles.exam, { backgroundColor: next.diff <= 3 ? colors.warnSoft : colors.accentSoft }]}
        >
          <Ionicons name="alarm-outline" size={22} color={next.diff <= 3 ? colors.warn : colors.accent} />
          <View style={styles.flex}>
            <AppText variant="caption" tone="muted">
              {next.label}
            </AppText>
            <AppText weight="700" numberOfLines={1}>
              {next.subject}
            </AppText>
            <AppText variant="caption" tone="textSoft">
              {next.when}
              {next.room ? ` · ${next.room}` : ''}
            </AppText>
          </View>
          <AppText variant="heading" tone={next.diff <= 3 ? 'warn' : 'accent'} style={styles.right}>
            {next.hours !== null && next.hours < 24 ? `${next.hours} цаг` : whenLabel(next.diff)}
          </AppText>
        </Pressable>
      ) : null}

      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="caption" tone="muted">
            {semester.academic_year} · {semester.name}
          </AppText>
          <AppText weight="600">Улирал дуусахад</AppText>
        </View>
        <View style={styles.right}>
          <AppText variant="display" tone={left <= 14 ? 'warn' : 'accent'} mono>
            {left}
          </AppText>
          <AppText variant="small" tone="muted">
            хоног
          </AppText>
        </View>
      </View>
      <ProgressBar value={elapsed} max={total} tone={left <= 14 ? 'warn' : 'accent'} height={6} />
      <View style={styles.dates}>
        <AppText variant="small" tone="faint">
          {date(semester.start_date)}
        </AppText>
        <AppText variant="small" tone="faint">
          {Math.round((elapsed / total) * 100)}% өнгөрсөн
        </AppText>
        <AppText variant="small" tone="faint">
          {date(semester.end_date)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  exam: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 12, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  right: { alignItems: 'flex-end', textAlign: 'right' },
  dates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
