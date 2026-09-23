import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, ChipFilter, EmptyState, QueryView, Screen, Segmented, SkeletonCards } from '../../components';
import { useCurrentSemester, useSchedules } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { useRole } from '../../store/auth.store';
import { radius, spacing, useTheme } from '../../theme';
import type { Schedule } from '../../types/models';
import { DAY_LABEL, DAY_SHORT, SESSION_TYPE_LABEL } from '../../utils/constants';
import { time, weekday } from '../../utils/format';

type Mode = 'day' | 'week';

/** §10 / §35 Хуваарь — өдрөөр, долоо хоногоор. Оюутан, багш хоёуланд. */
export function ScheduleScreen() {
  const role = useRole();
  const q = useSchedules();
  const semester = useCurrentSemester();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [mode, setMode] = useState<Mode>('day');
  const [day, setDay] = useState<string>(String(Math.min(weekday(), 7)));

  const byDay = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    (q.data ?? []).forEach((s) => map.set(s.day_of_week, [...(map.get(s.day_of_week) ?? []), s]));
    map.forEach((rows) => rows.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [q.data]);

  const today = weekday();
  const dayOptions = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
    value: String(d),
    label: d === today ? `${DAY_SHORT[d]} •` : DAY_SHORT[d],
    count: byDay.get(d)?.length ?? 0,
  }));

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {semester.data ? (
        <AppText variant="caption" tone="muted">
          {semester.data.academic_year} · {semester.data.name}
        </AppText>
      ) : null}
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'day', label: 'Өдрөөр' },
          { value: 'week', label: 'Долоо хоногоор' },
        ]}
      />
      <QueryView query={q} skeleton={<SkeletonCards />} isEmpty={(d) => d.length === 0} emptyIcon="calendar-outline" emptyTitle="Энэ улиралд хуваарь алга">
        {() =>
          mode === 'day' ? (
            <>
              <ChipFilter value={day} onChange={setDay} options={dayOptions} />
              <AppText variant="heading">
                {DAY_LABEL[Number(day)]}
                {Number(day) === today ? ' · Өнөөдөр' : ''}
              </AppText>
              {(byDay.get(Number(day)) ?? []).length === 0 ? (
                <EmptyState icon="cafe-outline" title="Энэ өдөр хичээлгүй" />
              ) : (
                (byDay.get(Number(day)) ?? []).map((s) => <SessionCard key={s.id} s={s} teacherView={role === 'teacher'} />)
              )}
            </>
          ) : (
            [1, 2, 3, 4, 5, 6, 7]
              .filter((d) => byDay.has(d))
              .map((d) => (
                <View key={d} style={styles.dayBlock}>
                  <AppText variant="heading" tone={d === today ? 'accent' : 'text'}>
                    {DAY_LABEL[d]}
                    {d === today ? ' · Өнөөдөр' : ''}
                  </AppText>
                  {byDay.get(d)!.map((s) => (
                    <SessionCard key={s.id} s={s} teacherView={role === 'teacher'} compact />
                  ))}
                </View>
              ))
          )
        }
      </QueryView>
    </Screen>
  );
}

export function SessionCard({ s, teacherView, right }: { s: Schedule; teacherView?: boolean; compact?: boolean; right?: ReactNode }) {
  const { colors } = useTheme();
  const place = s.is_online ? 'Онлайн' : [s.building, s.room].filter(Boolean).join(' · ') || '—';
  return (
    <Card padded={false} style={styles.card}>
      <View style={[styles.timeCol, { backgroundColor: colors.accentSoft }]}>
        <AppText weight="700" tone="accent" mono>
          {time(s.start_time)}
        </AppText>
        <AppText variant="small" tone="muted" mono>
          {time(s.end_time)}
        </AppText>
      </View>
      <View style={styles.info}>
        <AppText weight="600" numberOfLines={2}>
          {s.subject_name}
        </AppText>
        <View style={styles.metaRow}>
            <Ionicons name={teacherView ? 'people-outline' : 'person-outline'} size={14} color={colors.muted} />
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {teacherView ? `${s.class_name ?? '—'} · ${s.student_count ?? 0} оюутан` : s.teacher_name ?? 'Багш тодорхойгүй'}
          </AppText>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name={s.is_online ? 'wifi-outline' : 'location-outline'} size={14} color={colors.muted} />
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {place}
          </AppText>
        </View>
        <View style={styles.badges}>
          <Badge label={SESSION_TYPE_LABEL[s.session_type ?? 'lecture'] ?? 'Лекц'} tone="accent" />
          {s.is_online ? <Badge label="Онлайн" tone="success" /> : null}
          {s.group_id ? <Badge label="Нэгдсэн" tone="gold" /> : null}
        </View>
        {s.note ? (
          <AppText variant="small" tone="faint">
            {s.note}
          </AppText>
        ) : null}
      </View>
      {right}
    </Card>
  );
}

const styles = StyleSheet.create({
  dayBlock: { gap: spacing.sm },
  card: { flexDirection: 'row', overflow: 'hidden', alignItems: 'stretch' },
  timeCol: { width: 72, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  info: { flex: 1, padding: spacing.md, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
});
