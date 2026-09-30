import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText, Badge, Button, Card, QueryView, Screen, SkeletonCards, StatGrid, StatTile, useToast } from '../../components';
import { useWorkload } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { shareWorkloadPdf } from '../../services/workloadPdf';
import { spacing, useTheme } from '../../theme';
import type { SessionKind } from '../../types/models';
import { SESSION_TYPE_LABEL } from '../../utils/constants';

const KINDS: SessionKind[] = ['lecture', 'seminar', 'lab', 'exam'];

/**
 * Багшийн хичээлийн цаг (ачаалал).
 * Тодорхойлолтыг A4 PDF болгоод хуваалцах / хадгалах боломжтой.
 */
export function WorkloadScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const q = useWorkload();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (!q.data) return;
    setBusy(true);
    try {
      await shareWorkloadPdf(q.data);
    } catch (err) {
      toast.show(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <QueryView query={q} skeleton={<SkeletonCards />} emptyIcon="time-outline" emptyTitle="Хичээлийн цаг алга">
        {(w) => (
          <>
            {w.semester ? (
              <AppText variant="caption" tone="muted">
                {w.semester.label} · {w.weeks} долоо хоног
              </AppText>
            ) : null}

            <StatGrid>
              <StatTile label="Долоо хоногт" value={`${w.totals.weekly_hours} цаг`} icon="time-outline" hint={`${w.totals.sessions} хичээлийн цаг`} />
              <StatTile label="Улиралд" value={`${w.totals.semester_hours} цаг`} icon="calendar-outline" tone="gold" hint={`${w.weeks} долоо хоногоор`} />
              <StatTile label="Хичээл / анги" value={`${w.totals.courses} / ${w.totals.classes}`} icon="book-outline" hint={`${w.totals.credits} кредит`} />
              <StatTile
                label="Оюутан"
                value={String(w.totals.students)}
                icon="people-outline"
                tone={w.totals.cancelled ? 'warn' : 'success'}
                hint={w.totals.cancelled ? `${w.totals.cancelled} цуцлагдсан` : undefined}
              />
            </StatGrid>

            <Button
              variant="primary"
              icon="download-outline"
              title="Тодорхойлолт татах (PDF)"
              loading={busy}
              onPress={() => void share()}
            />

            <AppText variant="heading">Хичээл тус бүрийн цаг</AppText>
            {w.rows.map((r) => (
              <Card key={r.course_id}>
                <AppText weight="600" numberOfLines={2}>
                  {r.subject_name ?? '—'}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {[r.class_name, r.subject_code, r.credit ? `${r.credit} кредит` : null, `${r.student_count} оюутан`].filter(Boolean).join(' · ')}
                </AppText>
                <View style={styles.badges}>
                  {KINDS.filter((k) => r.weekly[k] > 0).map((k) => (
                    <Badge key={k} label={`${SESSION_TYPE_LABEL[k] ?? k} ${r.weekly[k]}ц`} tone="accent" />
                  ))}
                  {r.cancelled_count ? <Badge label={`${r.cancelled_count} цуцлагдсан`} tone="danger" /> : null}
                </View>
                <View style={[styles.totals, { borderTopColor: colors.border }]}>
                  <AppText variant="caption" tone="muted">
                    Долоо хоногт
                  </AppText>
                  <AppText weight="700" mono tone="accent">
                    {r.weekly_total} цаг
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    · Улиралд
                  </AppText>
                  <AppText weight="600" mono>
                    {r.semester_total} цаг
                  </AppText>
                </View>
              </Card>
            ))}

            <AppText variant="small" tone="faint">
              Нэг хичээлийн цаг = {w.academic_minutes} минут. Долоо хоногийн нийт {w.totals.weekly_minutes} минут.
            </AppText>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: spacing.sm },
  totals: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, flexWrap: 'wrap' },
});
