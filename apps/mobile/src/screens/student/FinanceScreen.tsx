import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card, EmptyState, InfoRow, ProgressBar, Screen, Section, SkeletonCards, ErrorState } from '../../components';
import { errorMessage } from '../../api/client';
import { useMyInvoices } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import type { AppScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';
import type { InvoiceStatus } from '../../types/models';
import { INVOICE_STATUS_LABEL } from '../../utils/constants';
import { date, money } from '../../utils/format';

const TONE: Record<InvoiceStatus, 'success' | 'warn' | 'danger' | 'neutral' | 'accent'> = {
  paid: 'success',
  partial: 'accent',
  pending: 'warn',
  overdue: 'danger',
  cancelled: 'neutral',
};

/** §16 Санхүү (зөвхөн харах), §18 Хөнгөлөлт */
export function FinanceScreen({ navigation }: AppScreenProps<'Finance'>) {
  const q = useMyInvoices();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const invoices = (q.data ?? []).filter((i) => i.status !== 'cancelled');

  const tuition = invoices.reduce((s, i) => s + Number(i.tuition_amount), 0);
  const discount = invoices.reduce((s, i) => s + Number(i.discount_amount), 0);
  const paid = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);
  const balance = invoices.reduce((s, i) => s + Math.max(0, Number(i.net_amount) - Number(i.paid_amount)), 0);
  const discounts = invoices.filter((i) => Number(i.discount_amount) > 0);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {q.isLoading ? (
        <SkeletonCards />
      ) : q.isError && !q.data ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Card tone={balance > 0 ? 'warn' : 'success'}>
            <AppText variant="caption" tone="muted">
              Төлбөрийн үлдэгдэл
            </AppText>
            <AppText variant="display" tone={balance > 0 ? 'warn' : 'success'} mono>
              {money(balance)}
            </AppText>
            <ProgressBar value={paid} max={Math.max(1, tuition - discount)} tone="success" />
            <AppText variant="small" tone="muted" style={styles.mt}>
              Нийт төлөх дүнгийн {tuition - discount > 0 ? Math.round((paid / (tuition - discount)) * 100) : 0}% төлөгдсөн
            </AppText>
          </Card>

          <Card>
            <InfoRow label="Сургалтын төлбөр" value={money(tuition)} />
            <InfoRow label="Хөнгөлөлт" value={discount ? `−${money(discount)}` : money(0)} />
            <InfoRow label="Төлсөн" value={money(paid)} />
            <InfoRow label="Үлдэгдэл" value={money(balance)} last />
          </Card>

          <Button title="Төлбөрийн түүх" icon="receipt-outline" variant="secondary" onPress={() => navigation.navigate('PaymentHistory')} />

          <Section title="Нэхэмжлэл">
            {invoices.length ? (
              invoices.map((i) => (
                <Card key={i.id}>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <AppText weight="600">{i.semester_name ?? i.description ?? 'Нэхэмжлэл'}</AppText>
                      <AppText variant="caption" tone="muted">
                        № {i.invoice_number}
                        {i.due_date ? ` · Төлөх: ${date(i.due_date)}` : ''}
                      </AppText>
                    </View>
                    <Badge label={INVOICE_STATUS_LABEL[i.status]} tone={TONE[i.status]} />
                  </View>
                  <InfoRow label="Төлөх дүн" value={money(i.net_amount)} />
                  <InfoRow label="Төлсөн" value={money(i.paid_amount)} />
                  <InfoRow label="Үлдэгдэл" value={money(Math.max(0, Number(i.net_amount) - Number(i.paid_amount)))} last />
                </Card>
              ))
            ) : (
              <Card>
                <EmptyState icon="wallet-outline" title="Нэхэмжлэл алга" />
              </Card>
            )}
          </Section>

          <Section title="Хөнгөлөлт, тэтгэлэг">
            {discounts.length ? (
              discounts.map((i) => (
                <Card key={i.id} tone="success">
                  <View style={styles.row}>
                    <AppText weight="600" style={styles.flex}>
                      {i.discount_note || 'Хөнгөлөлт'}
                    </AppText>
                    <AppText weight="700" tone="success">
                      −{money(i.discount_amount)}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="muted">
                    {i.semester_name}
                  </AppText>
                </Card>
              ))
            ) : (
              <Card>
                <AppText tone="muted" center>
                  Танд олгосон хөнгөлөлт алга
                </AppText>
              </Card>
            )}
          </Section>
          <AppText variant="small" tone="faint" center>
            Санхүүгийн мэдээлэлтэй холбоотой асуудлаар Санхүүгийн албанд хандана уу.
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  flex: { flex: 1 },
  mt: { marginTop: spacing.sm },
});
