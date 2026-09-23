import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/client';
import { AppText, Button, EmptyState, ErrorState, OfflineBanner, SearchBar, SkeletonList, useToast } from '../../components';
import { useCourseAttendance, useEnrollments, useSaveAttendance } from '../../hooks/queries';
import { useOnline } from '../../hooks/useOnline';
import type { AppScreenProps } from '../../navigation/types';
import { radius, spacing, useTheme } from '../../theme';
import type { AttendanceStatus } from '../../types/models';
import { ATTENDANCE_LABEL, ATTENDANCE_ORDER } from '../../utils/constants';
import { addDays, date, dayLabelOf, isoDate } from '../../utils/format';

const SHORT: Record<AttendanceStatus, string> = { present: 'Ирсэн', absent: 'Тас', late: 'Хоц', sick: 'Өвч', excused: 'Чөл' };

/** §30 Багш ирц бүртгэх — Save дарахад backend рүү хадгална (§43: зөвхөн online) */
export function AttendanceEntryScreen({ route, navigation }: AppScreenProps<'AttendanceEntry'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const online = useOnline();
  const { courseId, title } = route.params;
  const today = isoDate();
  const [day, setDay] = useState(route.params.date && route.params.date <= today ? route.params.date : today);
  const [search, setSearch] = useState('');
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [dirty, setDirty] = useState(false);

  const enrollments = useEnrollments(courseId);
  const existing = useCourseAttendance(courseId, day);
  const save = useSaveAttendance(courseId);

  const students = useMemo(() => (enrollments.data ?? []).filter((e) => e.status !== 'dropped'), [enrollments.data]);

  // Сонгосон өдрийн бүртгэлтэй ирцийг ачаална
  useEffect(() => {
    if (!existing.data) return;
    const next: Record<string, AttendanceStatus> = {};
    existing.data.forEach((a) => (next[a.student_id] = a.status));
    setMarks(next);
    setDirty(false);
  }, [existing.data]);

  // Хадгалаагүй өөрчлөлттэй гарахад анхааруулна
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!dirty || save.isPending) return;
        e.preventDefault();
        Alert.alert('Хадгалаагүй өөрчлөлт', 'Ирцийг хадгалалгүй гарах уу?', [
          { text: 'Үлдэх', style: 'cancel' },
          { text: 'Гарах', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]);
      }),
    [navigation, dirty, save.isPending],
  );

  const setMark = (id: string, s: AttendanceStatus) => {
    setMarks((m) => ({ ...m, [id]: s }));
    setDirty(true);
  };
  const markAll = (s: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((e) => (next[e.student_id] = s));
    setMarks(next);
    setDirty(true);
  };

  const changeDay = (delta: number) => {
    const next = addDays(day, delta);
    if (next > today) return;
    const go = () => setDay(next);
    if (dirty) {
      Alert.alert('Хадгалаагүй өөрчлөлт', 'Өдөр солиход өөрчлөлт алга болно.', [
        { text: 'Болих', style: 'cancel' },
        { text: 'Солих', onPress: go },
      ]);
    } else go();
  };

  const marked = students.filter((e) => marks[e.student_id]).length;
  const counts = ATTENDANCE_ORDER.map((s) => ({ s, n: students.filter((e) => marks[e.student_id] === s).length }));

  const onSave = () => {
    if (!online) return toast.show('Интернет холболт байхгүй байна. Холболтоо шалгаад дахин оролдоно уу.', 'danger');
    const missing = students.length - marked;
    const doSave = () =>
      save.mutate(
        { date: day, rows: students.filter((e) => marks[e.student_id]).map((e) => ({ student_id: e.student_id, status: marks[e.student_id] })) },
        {
          onSuccess: (r) => {
            setDirty(false);
            toast.show(`Ирц хадгалагдлаа (${r.saved})`, 'success');
          },
          onError: (err) => toast.show(errorMessage(err), 'danger'),
        },
      );
    if (!marked) return toast.show('Дор хаяж нэг оюутны ирц тэмдэглэнэ үү.', 'danger');
    if (missing > 0) {
      Alert.alert('Ирц дутуу', `${missing} оюутны ирц тэмдэглээгүй байна. Тэмдэглэсэн хэсгийг хадгалах уу?`, [
        { text: 'Болих', style: 'cancel' },
        { text: 'Хадгалах', onPress: doSave },
      ]);
    } else doSave();
  };

  const s = search.trim().toLowerCase();
  const shown = students.filter((e) => !s || `${e.student_name} ${e.student_code}`.toLowerCase().includes(s));
  const statusColor = (st: AttendanceStatus) => ({ present: colors.success, absent: colors.danger, late: colors.warn, sick: colors.gold, excused: colors.accent })[st];

  const header = (
    <View style={styles.header}>
      <AppText variant="heading" numberOfLines={2}>
        {title}
      </AppText>
      <View style={[styles.dateBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={() => changeDay(-1)} hitSlop={10} style={styles.dateBtn} accessibilityLabel="Өмнөх өдөр">
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </Pressable>
        <Pressable onPress={() => setDay(today)} style={styles.dateMid} accessibilityLabel="Өнөөдөр">
          <AppText weight="700" mono>
            {date(day)}
          </AppText>
          <AppText variant="caption" tone="muted">
            {dayLabelOf(day)}
            {day === today ? ' · Өнөөдөр' : ''}
          </AppText>
        </Pressable>
        <Pressable onPress={() => changeDay(1)} hitSlop={10} style={styles.dateBtn} disabled={day >= today} accessibilityLabel="Дараагийн өдөр">
          <Ionicons name="chevron-forward" size={22} color={day >= today ? colors.faint : colors.accent} />
        </Pressable>
      </View>
      <View style={styles.bulk}>
        <Button title="Бүгд ирсэн" icon="checkmark-done" size="sm" variant="secondary" onPress={() => markAll('present')} style={styles.flex} />
        <Button title="Цэвэрлэх" icon="refresh" size="sm" variant="ghost" onPress={() => { setMarks({}); setDirty(true); }} />
      </View>
      <SearchBar value={search} onChange={setSearch} placeholder="Оюутан хайх..." />
      <View style={styles.counts}>
        {counts.map(({ s: st, n }) => (
          <AppText key={st} variant="caption" style={{ color: statusColor(st) }} weight="600">
            {ATTENDANCE_LABEL[st]}: {n}
          </AppText>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <FlatList
        data={shown}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          enrollments.isLoading ? (
            <SkeletonList />
          ) : enrollments.isError ? (
            <ErrorState message={errorMessage(enrollments.error)} onRetry={() => void enrollments.refetch()} />
          ) : (
            <EmptyState icon="people-outline" title="Оюутан олдсонгүй" />
          )
        }
        renderItem={({ item: e, index }) => {
          const current = marks[e.student_id];
          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: current ? statusColor(current) : colors.border }]}>
              <View style={styles.nameRow}>
                <AppText variant="caption" tone="faint" style={styles.index}>
                  {index + 1}
                </AppText>
                <AppText weight="600" style={styles.flex} numberOfLines={1}>
                  {e.student_name}
                </AppText>
                <AppText variant="small" tone="muted" mono>
                  {e.student_code}
                </AppText>
              </View>
              <View style={styles.statuses}>
                {ATTENDANCE_ORDER.map((st) => {
                  const active = current === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setMark(e.student_id, st)}
                      style={[styles.status, { borderColor: statusColor(st), backgroundColor: active ? statusColor(st) : 'transparent' }]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${e.student_name}: ${ATTENDANCE_LABEL[st]}`}
                    >
                      <AppText variant="small" weight="700" style={{ color: active ? colors.surface : statusColor(st) }}>
                        {SHORT[st]}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <AppText variant="caption" tone="muted">
          {marked}/{students.length} тэмдэглэсэн
        </AppText>
        <Button title="Хадгалах" icon="save-outline" onPress={onSave} loading={save.isPending} disabled={!dirty && !!existing.data?.length} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 120 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  dateBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, minHeight: 56 },
  dateBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  dateMid: { flex: 1, alignItems: 'center' },
  bulk: { flexDirection: 'row', gap: spacing.sm },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  index: { width: 20, textAlign: 'right' },
  statuses: { flexDirection: 'row', gap: 6 },
  status: { flex: 1, minHeight: 40, borderWidth: 1.5, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
