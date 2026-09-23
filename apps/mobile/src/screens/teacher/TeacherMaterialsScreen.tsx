import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText, BottomSheet, Button, Card, Input, ListItem, QueryView, Screen, useToast } from '../../components';
import { MaterialItem } from '../common/MaterialItem';
import { qk, useCourseMaterials, useDeleteMaterial, useMaterialStats, useUpdateMaterial } from '../../hooks/queries';
import { useOnline } from '../../hooks/useOnline';
import { useRefresh } from '../../hooks/useRefresh';
import { uploadMaterial, type PickedFile } from '../../services/files';
import type { AppScreenProps } from '../../navigation/types';
import { spacing, useTheme } from '../../theme';
import type { CourseMaterial } from '../../types/models';
import { MATERIAL_MAX_SIZE, MATERIAL_MIME } from '../../utils/constants';
import { bytes } from '../../utils/format';

/** §33 Материал байршуулах, FR-T09 засах/устгах */
export function TeacherMaterialsScreen({ route }: AppScreenProps<'TeacherMaterials'>) {
  const { colors } = useTheme();
  const toast = useToast();
  const online = useOnline();
  const qc = useQueryClient();
  const { courseId, title } = route.params;
  const q = useCourseMaterials(courseId);
  const stats = useMaterialStats(courseId);
  const update = useUpdateMaterial(courseId);
  const remove = useDeleteMaterial(courseId);
  const { refreshing, onRefresh } = useRefresh(q.refetch, stats.refetch);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [form, setForm] = useState({ title: '', description: '', publish: true });
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CourseMaterial | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: MATERIAL_MIME, copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > MATERIAL_MAX_SIZE) return setFormError('Файлын хэмжээ 50MB-аас хэтэрсэн байна.');
    setFormError(null);
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size });
    if (!form.title) setForm((f) => ({ ...f, title: a.name.replace(/\.[^.]+$/, '') }));
  };

  const upload = async () => {
    setFormError(null);
    if (!online) return setFormError('Интернет холболт байхгүй байна.');
    if (!file) return setFormError('Файл сонгоно уу.');
    if (form.title.trim().length < 2) return setFormError('Гарчиг оруулна уу.');
    setUploading(true);
    try {
      await uploadMaterial(courseId, file, { title: form.title.trim(), description: form.description.trim() || null, is_published: form.publish });
      await qc.invalidateQueries({ queryKey: qk.materialsCourse(courseId) });
      toast.show('Материал байршлаа', 'success');
      setUploadOpen(false);
      setFile(null);
      setForm({ title: '', description: '', publish: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const togglePublish = (m: CourseMaterial) =>
    update.mutate(
      { id: m.id, body: { is_published: !m.is_published } },
      {
        onSuccess: () => toast.show(m.is_published ? 'Нийтлэлээс буцаалаа' : 'Нийтэллээ', 'success'),
        onError: (err) => toast.show(errorMessage(err), 'danger'),
      },
    );

  const confirmDelete = (m: CourseMaterial) =>
    Alert.alert('Материал устгах', `"${m.title}"-г устгах уу? Энэ үйлдлийг буцаах боломжгүй.`, [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Устгах',
        style: 'destructive',
        onPress: () =>
          remove.mutate(m.id, {
            onSuccess: () => {
              setSelected(null);
              toast.show('Устгагдлаа', 'success');
            },
            onError: (err) => toast.show(errorMessage(err), 'danger'),
          }),
      },
    ]);

  const totalStudents = stats.data?.total_students ?? 0;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <AppText variant="heading">{title}</AppText>
      <Button title="Материал нэмэх" icon="cloud-upload-outline" onPress={() => setUploadOpen(true)} disabled={!online} fullWidth />
      <QueryView query={q} isEmpty={(d) => d.length === 0} emptyIcon="folder-open-outline" emptyTitle="Энэ хичээлд материал оруулаагүй байна.">
        {(rows) => (
          <Card padded={false} style={styles.card}>
            {rows.map((m) => {
              const st = stats.data?.by_material[m.id];
              return (
                <MaterialItem
                  key={m.id}
                  m={m}
                  onPress={() => {
                    setSelected(m);
                    setEditTitle(m.title);
                  }}
                  extra={
                    totalStudents ? (
                      <AppText variant="small" tone="accent">
                        {st?.students ?? 0}/{totalStudents} оюутан үзсэн · {st?.downloads ?? 0} удаа
                      </AppText>
                    ) : null
                  }
                />
              );
            })}
          </Card>
        )}
      </QueryView>

      <BottomSheet
        visible={uploadOpen}
        onClose={() => !uploading && setUploadOpen(false)}
        title="Материал нэмэх"
        footer={<Button title="Байршуулах" icon="cloud-upload-outline" onPress={upload} loading={uploading} fullWidth />}
      >
        <Card onPress={pick} tone={file ? 'accent' : 'default'}>
          <AppText weight="600" tone={file ? 'accent' : 'text'}>
            {file ? file.name : 'Файл сонгох'}
          </AppText>
          <AppText variant="caption" tone="muted">
            {file ? bytes(file.size) : 'PDF, Word, PowerPoint, Excel, зураг, видео, ZIP · 50MB хүртэл'}
          </AppText>
        </Card>
        <Input label="Гарчиг" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} maxLength={200} placeholder="Week 1 – Introduction" />
        <Input label="Тайлбар" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} multiline maxLength={1000} />
        <View style={[styles.switchRow, { borderColor: colors.border }]}>
          <View style={styles.flex}>
            <AppText weight="600">Шууд нийтлэх</AppText>
            <AppText variant="caption" tone="muted">
              Нийтэлбэл оюутнуудад мэдэгдэл очно
            </AppText>
          </View>
          <Switch value={form.publish} onValueChange={(v) => setForm((f) => ({ ...f, publish: v }))} trackColor={{ true: colors.accent }} />
        </View>
        {formError ? (
          <AppText variant="caption" tone="danger">
            {formError}
          </AppText>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.title}>
        {selected ? (
          <>
            <Input label="Гарчиг засах" value={editTitle} onChangeText={setEditTitle} maxLength={200} />
            <Button
              title="Гарчиг хадгалах"
              variant="secondary"
              disabled={editTitle.trim().length < 2 || editTitle === selected.title}
              loading={update.isPending}
              onPress={() =>
                update.mutate(
                  { id: selected.id, body: { title: editTitle.trim() } },
                  { onSuccess: () => { setSelected(null); toast.show('Хадгалагдлаа', 'success'); }, onError: (err) => toast.show(errorMessage(err), 'danger') },
                )
              }
            />
            <ListItem
              title={selected.is_published ? 'Нийтлэлээс буцаах' : 'Нийтлэх'}
              subtitle={selected.is_published ? 'Оюутнуудад харагдахгүй болно' : 'Оюутнуудад харагдана'}
              icon={selected.is_published ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => {
                togglePublish(selected);
                setSelected(null);
              }}
            />
            <ListItem title="Устгах" icon="trash-outline" onPress={() => confirmDelete(selected)} divider={false} />
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 12, padding: spacing.md },
});
