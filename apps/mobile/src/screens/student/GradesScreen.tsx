import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, BottomSheet, Card, InfoRow, ProgressBar, QueryView, Screen, Select, SkeletonCards } from '../../components';
import { useMyGrades } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { spacing } from '../../theme';
import type { Enrollment } from '../../types/models';
import { GRADE_STATUS_LABEL } from '../../utils/constants';

/**
 * §14 Дүн — зөвхөн баталгаажсан эцсийн дүн харагдана.
 * Баталгаажаагүй үед API эцсийн оноог null болгож, зөвхөн явцын оноог өгнө.
 */
export function GradesScreen() {
  const q = useMyGrades();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [semester, setSemester] = useState<string>('all');
  const [open, setOpen] = useState<Enrollment | null>(null);

  const semesters = useMemo(() => [...new Set((q.data ?? []).map((g) => g.semester_name ?? ''))].filter(Boolean).sort().reverse(), [q.data]);
  const rows = (q.data ?? []).filter((g) => semester === 'all' || g.semester_name === semester);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Select
        label="Улирал"
        value={semester}
        onChange={setSemester}
        options={[{ value: 'all', label: 'Бүх улирал' }, ...semesters.map((s) => ({ value: s, label: s }))]}
      />
      <QueryView query={q} skeleton={<SkeletonCards count={4} />} isEmpty={(d) => d.length === 0} emptyIcon="ribbon-outline" emptyTitle="Дүнгийн мэдээлэл алга">
        {() =>
          rows.map((g) => {
            const approved = g.grade_status === 'approved';
            return (
              <Card key={g.id} onPress={() => setOpen(g)}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <AppText variant="heading" numberOfLines={2}>
                      {g.subject_name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {g.subject_code} · {g.credit ?? 0} кредит · {g.semester_name}
                    </AppText>
                  </View>
                  {approved ? (
                    <View style={styles.score}>
                      <AppText variant="display" tone="accent">
                        {g.letter_grade}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {g.total_score} · {g.gpa_point?.toFixed(1)}
                      </AppText>
                    </View>
                  ) : (
                    <Badge label="Баталгаажаагүй" tone="neutral" />
                  )}
                </View>
                {!approved && g.progress ? (
                  <View style={styles.progress}>
                    <AppText variant="caption" tone="muted">
                      Явцын оноо: {g.progress.earned} / {g.progress.graded_max} (нийт {g.progress.total_max})
                    </AppText>
                    <ProgressBar value={g.progress.earned} max={g.progress.total_max || 100} height={6} />
                  </View>
                ) : null}
              </Card>
            );
          })
        }
      </QueryView>

      <BottomSheet visible={!!open} onClose={() => setOpen(null)} title={open?.subject_name}>
        {open ? (
          <>
            <Badge label={GRADE_STATUS_LABEL[open.grade_status]} tone={open.grade_status === 'approved' ? 'success' : 'neutral'} />
            <Card padded={false} style={styles.sheetCard}>
              {open.progress?.items.map((i) => (
                <InfoRow key={i.id} label={i.name} value={i.score === null ? '—' : `${i.score}/${i.max_score}`} />
              ))}
              <InfoRow label="Нийт" value={open.grade_status === 'approved' ? open.total_score : '—'} />
              <InfoRow label="Үсгэн үнэлгээ" value={open.letter_grade} />
              <InfoRow label="GPA Point" value={open.gpa_point !== null ? open.gpa_point?.toFixed(1) : null} last />
            </Card>
            <AppText variant="caption" tone="muted">
              Багш: {open.teacher_name ?? '—'}
            </AppText>
            {open.grade_status !== 'approved' ? (
              <AppText variant="caption" tone="faint">
                Эцсийн дүн Сургалтын алба баталгаажуулсны дараа харагдана.
              </AppText>
            ) : null}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  score: { alignItems: 'flex-end' },
  progress: { marginTop: spacing.sm, gap: 6 },
  sheetCard: { paddingHorizontal: spacing.lg },
});
