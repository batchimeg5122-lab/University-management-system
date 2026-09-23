import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, QueryView, Screen, Segmented, SkeletonCards, type BadgeTone } from '../../components';
import { useExams } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { useRole } from '../../store/auth.store';
import { spacing, useTheme } from '../../theme';
import type { Exam, ExamType } from '../../types/models';
import { EXAM_TYPE_LABEL } from '../../utils/constants';
import { date, dayLabelOf, isoDate } from '../../utils/format';

const TONE: Record<ExamType, BadgeTone> = { final: 'danger', midterm: 'accent', quiz: 'gold', retake: 'warn', other: 'neutral' };

export function daysUntil(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function whenText(days: number) {
  if (days < 0) return 'Өнгөрсөн';
  if (days === 0) return 'Өнөөдөр';
  if (days === 1) return 'Маргааш';
  return `${days} хоногийн дараа`;
}

/** Шалгалтын хуваарь — Сургалтын алба / багш товлосон, огноогоор бүлэглэсэн */
export function ExamsScreen() {
  const { colors } = useTheme();
  const role = useRole();
  const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');
  const q = useExams(scope === 'upcoming');
  const { refreshing, onRefresh } = useRefresh(q.refetch);

  const groups = useMemo(() => {
    const map = new Map<string, Exam[]>();
    (q.data ?? []).forEach((e) => map.set(e.exam_date, [...(map.get(e.exam_date) ?? []), e]));
    return [...map.entries()].sort((a, b) => (scope === 'upcoming' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])));
  }, [q.data, scope]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Segmented
        value={scope}
        onChange={setScope}
        options={[
          { value: 'upcoming', label: 'Удахгүй болох' },
          { value: 'all', label: 'Бүгд' },
        ]}
      />
      <QueryView query={q} skeleton={<SkeletonCards />} isEmpty={(d) => d.length === 0} emptyIcon="calendar-outline" emptyTitle="Товлосон шалгалт алга" emptyMessage="Сургалтын алба шалгалт товлоход энд харагдаж, сануулга ирнэ.">
        {() =>
          groups.map(([day, exams]) => {
            const left = daysUntil(day);
            return (
              <View key={day} style={styles.group}>
                <View style={styles.dayRow}>
                  <AppText variant="heading" tone={left >= 0 && left <= 3 ? 'warn' : 'text'}>
                    {date(day)} · {dayLabelOf(day)}
                  </AppText>
                  <Badge label={whenText(left)} tone={left < 0 ? 'neutral' : left <= 3 ? 'warn' : 'accent'} />
                </View>
                {exams.map((e) => (
                  <Card key={e.id}>
                    <View style={styles.row}>
                      <View style={[styles.time, { backgroundColor: colors.accentSoft }]}>
                        <AppText weight="700" tone="accent" mono>
                          {e.start_time.slice(0, 5)}
                        </AppText>
                        <AppText variant="small" tone="muted" mono>
                          {e.end_time.slice(0, 5)}
                        </AppText>
                      </View>
                      <View style={styles.flex}>
                        <AppText weight="600" numberOfLines={2}>
                          {e.subject_name}
                        </AppText>
                        <View style={styles.meta}>
                          <Ionicons name={e.is_online ? 'wifi-outline' : 'location-outline'} size={14} color={colors.muted} />
                          <AppText variant="caption" tone="muted">
                            {e.is_online ? 'Онлайн' : [e.building, e.room].filter(Boolean).join(' · ') || 'Өрөө тодорхойгүй'}
                          </AppText>
                        </View>
                        <AppText variant="caption" tone="muted">
                          {role === 'teacher' ? e.class_name : e.teacher_name ?? ''}
                        </AppText>
                        <View style={styles.badges}>
                          <Badge label={EXAM_TYPE_LABEL[e.exam_type] ?? 'Шалгалт'} tone={TONE[e.exam_type]} />
                          {e.title && e.title !== EXAM_TYPE_LABEL[e.exam_type] ? <Badge label={e.title} /> : null}
                        </View>
                        {e.note ? (
                          <AppText variant="small" tone="textSoft">
                            📝 {e.note}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            );
          })
        }
      </QueryView>
      {scope === 'upcoming' && (q.data?.length ?? 0) > 0 ? (
        <AppText variant="small" tone="faint" center>
          Профайл → "Хичээлийн сануулга" асаалттай бол шалгалтын өмнөх орой 20:00, эхлэхээс 1 цагийн өмнө сануулна. Өнөөдөр: {isoDate()}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  group: { gap: spacing.sm },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: spacing.md },
  time: { width: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
});
