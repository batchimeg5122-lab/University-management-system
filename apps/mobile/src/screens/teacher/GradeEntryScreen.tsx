import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/client';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, OfflineBanner, SearchBar, SkeletonList, useToast } from '../../components';
import { useEnrollments, useGradeItems, useSaveGrades, useSubmitGrades } from '../../hooks/queries';
import { useOnline } from '../../hooks/useOnline';
import type { AppScreenProps } from '../../navigation/types';
import { font, radius, spacing, useTheme } from '../../theme';
import type { Enrollment, GradeItem, GradeStatus } from '../../types/models';
import { GRADE_STATUS_LABEL } from '../../utils/constants';
import { computeTotal, scoreToGrade } from '../../utils/gpa';

type Draft = Record<string, Record<string, string>>;
const EDITABLE: GradeStatus[] = ['draft', 'rejected'];

const toText = (scores: Record<string, number>) => Object.fromEntries(Object.entries(scores ?? {}).map(([k, v]) => [k, String(v)]));

function parseScores(row: Record<string, string>, items: GradeItem[]) {
  const out: Record<string, number> = {};
  for (const item of items) {
    const raw = (row[item.id] ?? '').replace(',', '.').trim();
    if (raw === '') continue;
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error(`"${item.name}" оноо тоо биш байна.`);
    if (n < 0 || n > item.max_score) throw new Error(`"${item.name}" оноо 0–${item.max_score} хооронд байна.`);
    out[item.id] = n;
  }
  return out;
}

/** §31 Дүн оруулах, §32 Draft → Submit → Сургалтын алба */
export function GradeEntryScreen({ route, navigation }: AppScreenProps<'GradeEntry'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const online = useOnline();
  const { courseId, title } = route.params;
  const items = useGradeItems(courseId);
  const enrollments = useEnrollments(courseId);
  const save = useSaveGrades(courseId);
  const submit = useSubmitGrades(courseId);

  const [draft, setDraft] = useState<Draft>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const students = useMemo(() => (enrollments.data ?? []).filter((e) => e.status !== 'dropped'), [enrollments.data]);
  const gradeItems = useMemo(() => [...(items.data ?? [])].sort((a, b) => a.sort_order - b.sort_order), [items.data]);
  const maxTotal = gradeItems.reduce((s, i) => s + Number(i.max_score), 0);

  useEffect(() => {
    if (!enrollments.data) return;
    setDraft(Object.fromEntries(enrollments.data.map((e) => [e.id, toText(e.scores)])));
    setDirty(new Set());
  }, [enrollments.data]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!dirty.size || save.isPending) return;
        e.preventDefault();
        Alert.alert('Хадгалаагүй өөрчлөлт', 'Дүнг хадгалалгүй гарах уу?', [
          { text: 'Үлдэх', style: 'cancel' },
          { text: 'Гарах', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]);
      }),
    [navigation, dirty, save.isPending],
  );

  const setScore = (enrollmentId: string, itemId: string, value: string) => {
    setDraft((d) => ({ ...d, [enrollmentId]: { ...(d[enrollmentId] ?? {}), [itemId]: value.replace(/[^0-9.,]/g, '') } }));
    setDirty((s) => new Set(s).add(enrollmentId));
  };

  const statusCount = students.reduce<Record<string, number>>((acc, e) => ((acc[e.grade_status] = (acc[e.grade_status] ?? 0) + 1), acc), {});
  const editableCount = students.filter((e) => EDITABLE.includes(e.grade_status)).length;

  const onSave = async (): Promise<boolean> => {
    if (!online) {
      toast.show('Интернет холболт байхгүй байна. Холболтоо шалгаад дахин оролдоно уу.', 'danger');
      return false;
    }
    try {
      const rows = students
        .filter((e) => dirty.has(e.id) && EDITABLE.includes(e.grade_status))
        .map((e) => ({ enrollment_id: e.id, scores: parseScores(draft[e.id] ?? {}, gradeItems) }));
      if (!rows.length) return true;
      await save.mutateAsync(rows);
      setDirty(new Set());
      toast.show('Дүн ноорог байдлаар хадгалагдлаа', 'success');
      return true;
    } catch (err) {
      toast.show(errorMessage(err), 'danger');
      return false;
    }
  };

  const onSubmit = () => {
    Alert.alert(
      'Дүн илгээх',
      'Бүх оюутны дүнг Сургалтын албанд баталгаажуулахаар илгээнэ. Илгээсний дараа засах боломжгүй. Үргэлжлүүлэх үү?',
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Илгээх',
          onPress: async () => {
            if (!(await onSave())) return;
            submit.mutate(undefined, {
              onSuccess: (r) => toast.show(`${r.submitted} оюутны дүн илгээгдлээ`, 'success'),
              onError: (err) => toast.show(errorMessage(err), 'danger'),
            });
          },
        },
      ],
    );
  };

  const s = search.trim().toLowerCase();
  const shown = students.filter((e) => !s || `${e.student_name} ${e.student_code}`.toLowerCase().includes(s));

  const renderStudent = (e: Enrollment, index: number) => {
    const editable = EDITABLE.includes(e.grade_status);
    const row = draft[e.id] ?? {};
    let preview: { total: number; complete: boolean } = { total: 0, complete: false };
    try {
      preview = computeTotal(parseScores(row, gradeItems), gradeItems);
    } catch {
      /* буруу утга — доор улаанаар харагдана */
    }
    const letter = preview.complete ? scoreToGrade(preview.total).letter : null;
    return (
      <Card>
        <View style={styles.nameRow}>
          <AppText variant="caption" tone="faint">
            {index + 1}.
          </AppText>
          <View style={styles.flex}>
            <AppText weight="600" numberOfLines={1}>
              {e.student_name}
            </AppText>
            <AppText variant="small" tone="muted" mono>
              {e.student_code}
            </AppText>
          </View>
          <Badge
            label={GRADE_STATUS_LABEL[e.grade_status]}
            tone={e.grade_status === 'approved' ? 'success' : e.grade_status === 'rejected' ? 'danger' : e.grade_status === 'submitted' ? 'accent' : 'neutral'}
          />
        </View>
        <View style={styles.items}>
          {gradeItems.map((item) => {
            const raw = row[item.id] ?? '';
            const invalid = raw !== '' && (Number.isNaN(Number(raw.replace(',', '.'))) || Number(raw.replace(',', '.')) > item.max_score);
            return (
              <View key={item.id} style={styles.item}>
                <AppText variant="small" tone="muted" numberOfLines={1}>
                  {item.name} /{item.max_score}
                </AppText>
                <TextInput
                  value={raw}
                  onChangeText={(v) => setScore(e.id, item.id, v)}
                  editable={editable}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  placeholder="—"
                  placeholderTextColor={colors.faint}
                  accessibilityLabel={`${e.student_name}, ${item.name}`}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: invalid ? colors.danger : colors.borderStrong,
                      backgroundColor: editable ? colors.surface : colors.surfaceAlt,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.totalRow}>
          <AppText variant="caption" tone="muted">
            Нийт
          </AppText>
          <AppText weight="700" tone={preview.complete ? 'accent' : 'muted'} mono>
            {preview.total}/{maxTotal} {letter ? `· ${letter}` : ''}
          </AppText>
        </View>
      </Card>
    );
  };

  const loading = enrollments.isLoading || items.isLoading;
  const error = enrollments.error ?? items.error;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <FlatList
        data={shown}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="heading">{title}</AppText>
            <View style={styles.badges}>
              {Object.entries(statusCount).map(([st, n]) => (
                <Badge key={st} label={`${GRADE_STATUS_LABEL[st as GradeStatus]}: ${n}`} tone={st === 'approved' ? 'success' : st === 'rejected' ? 'danger' : st === 'submitted' ? 'accent' : 'neutral'} />
              ))}
            </View>
            {statusCount.rejected ? (
              <Card tone="danger">
                <AppText variant="caption" tone="danger">
                  Сургалтын алба дүнг буцаасан байна. Шалтгааныг Мэдэгдэл хэсгээс харж, засаад дахин илгээнэ үү.
                </AppText>
              </Card>
            ) : null}
            <SearchBar value={search} onChange={setSearch} placeholder="Оюутан хайх..." />
          </View>
        }
        ListEmptyComponent={loading ? <SkeletonList /> : error ? <ErrorState message={errorMessage(error)} onRetry={() => void enrollments.refetch()} /> : <EmptyState icon="people-outline" title="Оюутан олдсонгүй" />}
        renderItem={({ item, index }) => renderStudent(item, index)}
      />
      {editableCount > 0 ? (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button title="Хадгалах" icon="save-outline" variant="secondary" onPress={() => void onSave()} loading={save.isPending} disabled={!dirty.size} style={styles.flex} />
          <Button title="Илгээх" icon="send-outline" onPress={onSubmit} loading={submit.isPending} style={styles.flex} />
        </View>
      ) : students.length ? (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <AppText variant="caption" tone="muted" center style={styles.flex}>
            Дүн илгээгдсэн / баталгаажсан тул засах боломжгүй.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: 120 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { flexBasis: '30%', flexGrow: 1, gap: 4 },
  input: { borderWidth: 1, borderRadius: radius.sm, minHeight: 44, paddingHorizontal: spacing.sm, fontSize: font.md, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
