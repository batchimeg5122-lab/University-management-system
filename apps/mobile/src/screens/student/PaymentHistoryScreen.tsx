import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText, Badge, Card, EmptyState, ErrorState, OfflineBanner, SkeletonList } from '../../components';
import { useMyPayments } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { spacing, useTheme } from '../../theme';
import { PAYMENT_METHOD_LABEL } from '../../utils/constants';
import { date, money } from '../../utils/format';

const PAGE = 20;

/** §17 Төлбөрийн түүх — infinite scroll */
export function PaymentHistoryScreen() {
  const { colors } = useTheme();
  const q = useMyPayments();
  const { refreshing, onRefresh } = useRefresh(q.refetch);
  const [limit, setLimit] = useState(PAGE);
  const rows = [...(q.data ?? [])].sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const total = rows.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <FlatList
        data={rows.slice(0, limit)}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        onEndReached={() => rows.length > limit && setLimit((l) => l + PAGE)}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          rows.length ? (
            <Card tone="accent" style={styles.header}>
              <AppText variant="caption" tone="muted">
                Нийт төлсөн
              </AppText>
              <AppText variant="title" tone="accent" mono>
                {money(total)}
              </AppText>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          q.isLoading ? (
            <SkeletonList />
          ) : q.isError && !q.data ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
          ) : (
            <EmptyState icon="receipt-outline" title="Төлбөрийн түүх алга" />
          )
        }
        renderItem={({ item: p }) => (
          <Card>
            <View style={styles.row}>
              <View style={styles.flex}>
                <AppText weight="600" mono>
                  {date(p.payment_date)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                  {p.invoice_number ? ` · № ${p.invoice_number}` : ''}
                </AppText>
                {p.description ? (
                  <AppText variant="small" tone="faint">
                    {p.description}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.right}>
                <AppText variant="heading" mono>
                  {money(p.amount)}
                </AppText>
                <Badge label="Төлөгдсөн" tone="success" />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  right: { alignItems: 'flex-end', gap: 4 },
});
