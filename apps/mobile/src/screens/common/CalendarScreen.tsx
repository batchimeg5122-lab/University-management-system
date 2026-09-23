import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, QueryView, Screen, SkeletonCards } from '../../components';
import { useCalendar } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { spacing, useTheme, type ThemeColors } from '../../theme';
import type { AcademicEventType } from '../../types/models';
import { date, isoDate } from '../../utils/format';
import { daysUntil, whenText } from './ExamsScreen';

const LABEL: Record<AcademicEventType, string> = {
  holiday: 'Амралтын өдөр',
  break: 'Амралт',
  exam_week: 'Шалгалтын долоо хоног',
  registration: 'Бүртгэл',
  deadline: 'Эцсийн хугацаа',
  event: 'Арга хэмжээ',
};

const color = (t: AcademicEventType, c: ThemeColors) =>
  ({ holiday: c.danger, break: c.warn, exam_week: c.accent, registration: c.accent, deadline: c.gold, event: c.success })[t];

const MONTHS = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];

/** Академик календарь — удахгүй болох амралт, шалгалтын долоо хоног, эцсийн хугацаа */
export function CalendarScreen() {
  const { colors } = useTheme();
  const q = useCalendar();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const today = isoDate();

  const months = useMemo(() => {
    const map = new Map<string, NonNullable<typeof q.data>>();
    (q.data ?? []).forEach((e) => {
      const key = (e.start_date < today ? today : e.start_date).slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [q.data, today]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <QueryView query={q} skeleton={<SkeletonCards />} isEmpty={(d) => d.length === 0} emptyIcon="calendar-clear-outline" emptyTitle="Удахгүй болох үйл явдал алга">
        {() =>
          months.map(([ym, events]) => (
            <View key={ym} style={styles.group}>
              <AppText variant="heading">
                {ym.slice(0, 4)} оны {MONTHS[Number(ym.slice(5, 7)) - 1]}
              </AppText>
              {events.map((e) => {
                const ongoing = e.start_date <= today && e.end_date >= today;
                const left = daysUntil(e.start_date);
                return (
                  <Card key={e.id} padded={false} style={styles.card}>
                    <View style={[styles.bar, { backgroundColor: color(e.event_type, colors) }]} />
                    <View style={styles.body}>
                      <AppText weight="600">{e.title}</AppText>
                      <AppText variant="caption" tone="muted">
                        {date(e.start_date)}
                        {e.end_date !== e.start_date ? ` – ${date(e.end_date)}` : ''}
                      </AppText>
                      <View style={styles.badges}>
                        <Badge label={LABEL[e.event_type]} />
                        {ongoing ? <Badge label="Одоо үргэлжилж байна" tone="success" /> : left <= 14 ? <Badge label={whenText(left)} tone="warn" /> : null}
                      </View>
                      {e.description ? (
                        <AppText variant="caption" tone="textSoft">
                          {e.description}
                        </AppText>
                      ) : null}
                    </View>
                  </Card>
                );
              })}
            </View>
          ))
        }
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  card: { flexDirection: 'row', overflow: 'hidden' },
  bar: { width: 5 },
  body: { flex: 1, padding: spacing.md, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
