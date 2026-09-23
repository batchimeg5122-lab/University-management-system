import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText, Badge, BottomSheet, Button, Card, Input, QueryView, Screen, Select, useToast } from '../../components';
import { useCertificates, useCreateCertificate } from '../../hooks/queries';
import { useOnline } from '../../hooks/useOnline';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { spacing, useTheme } from '../../theme';
import { CERT_PURPOSE } from '../../utils/constants';
import { date } from '../../utils/format';

const VALID_OPTIONS = [
  { value: '30', label: '30 хоног' },
  { value: '60', label: '60 хоног' },
  { value: '90', label: '90 хоног' },
];

/** §21 Суралцаж буй тухай тодорхойлолт авах */
export function CertificatesScreen({ navigation }: AppScreenProps<'Certificates'>) {
  const { colors } = useTheme();
  const toast = useToast();
  const online = useOnline();
  const q = useCertificates();
  const create = useCreateCertificate();
  const { refreshing, onRefresh } = useRefresh(q.refetch);

  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState('bank');
  const [note, setNote] = useState('');
  const [includeGpa, setIncludeGpa] = useState(false);
  const [valid, setValid] = useState('30');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (purpose === 'other' && !note.trim()) return setError('Зориулалтаа тайлбарлана уу.');
    create.mutate(
      { purpose, purpose_note: note.trim() || null, include_gpa: includeGpa, valid_days: Number(valid) },
      {
        onSuccess: (cert) => {
          setOpen(false);
          setNote('');
          toast.show('Тодорхойлолт үүслээ', 'success');
          navigation.navigate('CertificateDetail', { id: cert.id });
        },
        onError: (err) => setError(errorMessage(err)),
      },
    );
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Button title="Шинэ тодорхойлолт авах" icon="add-circle-outline" onPress={() => setOpen(true)} disabled={!online} fullWidth />
      {!online ? (
        <AppText variant="caption" tone="warn" center>
          Тодорхойлолт үүсгэхэд интернет холболт шаардлагатай.
        </AppText>
      ) : null}

      <QueryView query={q} isEmpty={(d) => d.length === 0} emptyIcon="document-text-outline" emptyTitle="Тодорхойлолт аваагүй байна">
        {(rows) =>
          rows.map((c) => (
            <Card key={c.id} onPress={() => navigation.navigate('CertificateDetail', { id: c.id })}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <AppText weight="700" mono>
                    {c.number}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {CERT_PURPOSE[c.purpose] ?? c.purpose}
                  </AppText>
                  <AppText variant="small" tone="faint">
                    {date(c.issued_at)} → {date(c.valid_until)}
                  </AppText>
                </View>
                <Badge label={c.is_valid ? 'Хүчинтэй' : c.revoked_at ? 'Цуцлагдсан' : 'Хугацаа дууссан'} tone={c.is_valid ? 'success' : 'danger'} />
              </View>
            </Card>
          ))
        }
      </QueryView>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Тодорхойлолт авах"
        footer={<Button title="Үүсгэх" onPress={submit} loading={create.isPending} fullWidth />}
      >
        <Select label="Зориулалт" value={purpose} onChange={setPurpose} options={Object.entries(CERT_PURPOSE).map(([value, label]) => ({ value, label }))} />
        <Input label="Тайлбар" value={note} onChangeText={setNote} placeholder="Жишээ: Хаан банкинд" maxLength={200} error={error} />
        <Select label="Хүчинтэй хугацаа" value={valid} onChange={setValid} options={VALID_OPTIONS} />
        <View style={[styles.switchRow, { borderColor: colors.border }]}>
          <View style={styles.flex}>
            <AppText weight="600">GPA оруулах</AppText>
            <AppText variant="caption" tone="muted">
              Голч дүн, кредитийг тодорхойлолтод харуулна
            </AppText>
          </View>
          <Switch value={includeGpa} onValueChange={setIncludeGpa} trackColor={{ true: colors.accent }} accessibilityLabel="GPA оруулах" />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 12, padding: spacing.md },
});
