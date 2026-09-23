import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { certificateApi } from '../../api/certificate.api';
import { errorMessage } from '../../api/client';
import { AppText, Button, Card, InfoRow, Input, Screen } from '../../components';
import { spacing, useTheme } from '../../theme';
import { STUDENT_STATUS_LABEL } from '../../utils/constants';
import { date } from '../../utils/format';
import type { StudentStatus } from '../../types/models';

/** §22 Гуравдагч этгээд verify code-оор тодорхойлолт шалгах (нэвтрэх шаардлагагүй) */
export function VerifyCertificateScreen({ route }: { route: { params?: { code?: string } } }) {
  const { colors } = useTheme();
  const [input, setInput] = useState(route.params?.code ?? '');
  const [code, setCode] = useState(route.params?.code ?? '');

  const q = useQuery({ queryKey: ['verify', code], queryFn: () => certificateApi.verify(code), enabled: code.length >= 6, retry: false });

  const onCheck = () => {
    // QR-аас хуулсан бүтэн URL-аас кодыг салгаж авна
    const cleaned = input.trim().split('/').pop() ?? '';
    setCode(cleaned.toUpperCase());
  };

  return (
    <Screen keyboard>
      <AppText tone="muted">Тодорхойлолт дээрх баталгаажуулах кодыг оруулж хүчинтэй эсэхийг шалгана уу.</AppText>
      <Input label="Баталгаажуулах код" value={input} onChangeText={setInput} autoCapitalize="characters" placeholder="A8F4C29D..." icon="key-outline" onSubmitEditing={onCheck} />
      <Button title="Шалгах" icon="shield-checkmark-outline" onPress={onCheck} loading={q.isFetching} fullWidth />

      {q.isError ? (
        <Card tone="danger">
          <AppText tone="danger">{errorMessage(q.error)}</AppText>
        </Card>
      ) : null}

      {q.data ? (
        <Card>
          <View style={styles.head}>
            <Ionicons name={q.data.is_valid ? 'checkmark-circle' : 'close-circle'} size={36} color={q.data.is_valid ? colors.success : colors.danger} />
            <View style={styles.flex}>
              <AppText variant="heading" tone={q.data.is_valid ? 'success' : 'danger'}>
                {q.data.is_valid ? 'Хүчинтэй' : q.data.revoked ? 'Хүчингүй болгосон' : 'Хугацаа дууссан'}
              </AppText>
              <AppText variant="caption" tone="muted">
                {q.data.number}
              </AppText>
            </View>
          </View>
          <InfoRow label="Оюутны нэр" value={q.data.full_name} />
          <InfoRow label="Оюутны код" value={q.data.student_code} />
          <InfoRow label="Хөтөлбөр" value={q.data.program_name} />
          <InfoRow label="Анги" value={q.data.class_name} />
          <InfoRow label="Төлөв" value={q.data.status ? STUDENT_STATUS_LABEL[q.data.status as StudentStatus] ?? q.data.status : null} />
          <InfoRow label="Олгосон" value={date(q.data.issued_at)} />
          <InfoRow label="Хүчинтэй хугацаа" value={date(q.data.valid_until)} last />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  flex: { flex: 1 },
});
