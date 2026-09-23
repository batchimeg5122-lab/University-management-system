import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { certificateApi } from '../../api/certificate.api';
import { AppText, Badge, Button, Card, InfoRow, QueryView, Screen, useToast } from '../../components';
import { BRAND, env } from '../../constants/env';
import { shareCertificatePdf } from '../../services/certificatePdf';
import type { AppScreenProps } from '../../navigation/types';
import { spacing, useTheme } from '../../theme';
import type { StudentStatus } from '../../types/models';
import { CERT_PURPOSE, STUDENT_STATUS_LABEL } from '../../utils/constants';
import { date, gpa } from '../../utils/format';

/** §21 Тодорхойлолтын дугаар, verify code, QR code */
export function CertificateDetailScreen({ route }: AppScreenProps<'CertificateDetail'>) {
  const { colors } = useTheme();
  const toast = useToast();
  const q = useQuery({ queryKey: ['certificate', route.params.id], queryFn: () => certificateApi.detail(route.params.id) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrRef = useRef<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  /** QR-ыг PNG болгож PDF-д шигтгэнэ */
  const qrPng = () =>
    new Promise<string | null>((resolve) => {
      if (!qrRef.current?.toDataURL) return resolve(null);
      try {
        qrRef.current.toDataURL((data: string) => resolve(data.replace(/(\r\n|\n|\r)/gm, '')));
      } catch {
        resolve(null);
      }
    });

  return (
    <Screen>
      <QueryView query={q}>
        {(c) => {
          const verifyUrl = `${env.webUrl}/verify/${c.verify_code}`;
          const s = c.snapshot;
          return (
            <>
              <Card style={styles.center}>
                <AppText variant="caption" tone="muted" center>
                  {BRAND.name}
                </AppText>
                <AppText variant="title" center mono>
                  {c.number}
                </AppText>
                <Badge label={c.is_valid ? 'Хүчинтэй' : c.revoked_at ? 'Цуцлагдсан' : 'Хугацаа дууссан'} tone={c.is_valid ? 'success' : 'danger'} />
                <View style={styles.qr}>
                  <QRCode value={verifyUrl} size={180} backgroundColor="#FFFFFF" color="#172033" getRef={(c) => (qrRef.current = c)} />
                </View>
                <AppText variant="caption" tone="muted" center>
                  Баталгаажуулах код
                </AppText>
                <AppText variant="heading" tone="accent" center mono selectable style={styles.code}>
                  {c.verify_code}
                </AppText>
              </Card>

              <Card>
                <InfoRow label="Оюутан" value={s.full_name} />
                <InfoRow label="Оюутны код" value={s.student_code} />
                <InfoRow label="Хөтөлбөр" value={s.program_name} />
                <InfoRow label="Анги" value={s.class_name} />
                <InfoRow label="Курс" value={s.year_level ? `${s.year_level}-р курс` : null} />
                <InfoRow label="Төлөв" value={STUDENT_STATUS_LABEL[s.status as StudentStatus] ?? s.status} />
                {c.include_gpa ? <InfoRow label="GPA / кредит" value={`${gpa(s.gpa)} / ${s.earned_credits ?? 0}`} /> : null}
                <InfoRow label="Зориулалт" value={`${CERT_PURPOSE[c.purpose] ?? c.purpose}${c.purpose_note ? ` — ${c.purpose_note}` : ''}`} />
                <InfoRow label="Олгосон" value={date(c.issued_at)} />
                <InfoRow label="Хүчинтэй хугацаа" value={date(c.valid_until)} last />
              </Card>

              <Button
                title="PDF татах / илгээх"
                icon="document-attach-outline"
                loading={pdfBusy}
                fullWidth
                onPress={async () => {
                  setPdfBusy(true);
                  try {
                    await shareCertificatePdf(c, verifyUrl, await qrPng());
                  } catch (err) {
                    toast.show((err as Error).message || 'PDF үүсгэж чадсангүй', 'danger');
                  } finally {
                    setPdfBusy(false);
                  }
                }}
              />
              <View style={styles.actions}>
                <Button
                  title="Код хуулах"
                  icon="copy-outline"
                  variant="secondary"
                  style={styles.flex}
                  onPress={async () => {
                    await Clipboard.setStringAsync(c.verify_code);
                    toast.show('Код хуулагдлаа', 'success');
                  }}
                />
                <Button
                  title="Холбоос илгээх"
                  icon="share-outline"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() =>
                    void Share.share({
                      message: `${BRAND.name} — суралцаж буй тухай тодорхойлолт ${c.number}\nОюутан: ${s.full_name}\nШалгах: ${verifyUrl}\nКод: ${c.verify_code}`,
                    })
                  }
                />
              </View>
              <AppText variant="small" tone="faint" center style={{ color: colors.faint }}>
                Гуравдагч этгээд QR кодыг уншуулах эсвэл {env.webUrl}/verify хаягаар шалгана.
              </AppText>
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm },
  qr: { padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: 12, marginVertical: spacing.sm },
  code: { letterSpacing: 2 },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
