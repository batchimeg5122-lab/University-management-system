import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { AppStackParamList } from '../../navigation/types';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../api/client';
import {
  AppText, Badge, BottomSheet, Button, EmptyState, ErrorState, OfflineBanner, SearchBar, Segmented, SkeletonList, useToast,
} from '../../components';
import { useMarkAllRead, useMarkRead, useNotifications } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { radius, spacing, useTheme } from '../../theme';
import type { Notification, NotificationType } from '../../types/models';
import { NOTIFICATION_TYPE_LABEL } from '../../utils/constants';
import { dateTime, relative } from '../../utils/format';
import { hasTarget, openNotificationTarget } from '../../utils/notificationRoute';
import { useRole } from '../../store/auth.store';

type Tab = 'all' | 'personal' | 'announcements';
const PAGE = 20;

const ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  general: 'information-circle-outline',
  grade: 'ribbon-outline',
  attendance: 'checkmark-done-outline',
  schedule: 'calendar-outline',
  finance: 'wallet-outline',
  announcement: 'megaphone-outline',
};

/** §23 Мэдэгдэл, §25 Зарлал — хайлт, шүүлт, infinite scroll */
export function NotificationsScreen({ initialTab = 'all' }: { initialTab?: Tab }) {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const role = useRole();
  const toast = useToast();
  const q = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const { refreshing, onRefresh } = useRefresh(q.refetch);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<Notification | null>(null);

  const all = q.data ?? [];
  const unread = all.filter((n) => n.user_id && !n.is_read).length;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all
      .filter((n) => {
        // Мэдэгдэл илгээх төвөөс ирсэн (broadcast) мэдэгдэл нь хувийн мөр боловч төрөл нь 'announcement'
        const isAnnouncement = !n.user_id || n.type === 'announcement';
        return tab === 'personal' ? !isAnnouncement : tab === 'announcements' ? isAnnouncement : true;
      })
      .filter((n) => !s || n.title.toLowerCase().includes(s) || n.message.toLowerCase().includes(s));
  }, [all, tab, search]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unread > 0 ? (
          <Pressable
            onPress={() => markAll.mutate(undefined, { onSuccess: () => toast.show('Бүгдийг уншсан болголоо', 'success') })}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Бүгдийг уншсан болгох"
          >
            <Ionicons name="checkmark-done" size={24} color={colors.accent} />
          </Pressable>
        ) : null,
    });
  }, [navigation, unread, colors.accent, markAll, toast]);

  const openItem = (n: Notification) => {
    setOpen(n);
    if (n.user_id && !n.is_read) markRead.mutate(n.id);
  };

  const header = (
    <View style={styles.header}>
      <Segmented<Tab>
        value={tab}
        onChange={(v) => {
          setTab(v);
          setLimit(PAGE);
        }}
        options={[
          { value: 'all', label: 'Бүгд' },
          { value: 'personal', label: 'Надад', count: unread },
          { value: 'announcements', label: 'Зарлал' },
        ]}
      />
      <SearchBar value={search} onChange={setSearch} placeholder="Мэдэгдэл хайх..." />
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <FlatList
        data={filtered.slice(0, limit)}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        onEndReached={() => filtered.length > limit && setLimit((l) => l + PAGE)}
        onEndReachedThreshold={0.4}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          q.isLoading ? (
            <SkeletonList />
          ) : q.isError && !q.data ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
          ) : (
            <EmptyState
              icon="notifications-off-outline"
              title={search ? 'Хайлтад тохирох мэдэгдэл алга' : 'Одоогоор танд шинэ мэдэгдэл байхгүй байна.'}
            />
          )
        }
        renderItem={({ item: n }) => {
          const isUnread = !!n.user_id && !n.is_read;
          return (
            <Pressable
              onPress={() => openItem(n)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: isUnread ? colors.accentSoft : colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.surface }]}>
                <Ionicons name={ICON[n.type] ?? 'notifications-outline'} size={20} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <View style={styles.row}>
                  <AppText weight={isUnread ? '700' : '600'} numberOfLines={1} style={styles.flex}>
                    {n.title}
                  </AppText>
                  {isUnread ? <View style={[styles.dot, { backgroundColor: colors.accent }]} /> : null}
                </View>
                <AppText variant="caption" tone="muted" numberOfLines={2}>
                  {n.message}
                </AppText>
                <View style={styles.row}>
                  <Badge label={NOTIFICATION_TYPE_LABEL[n.type] ?? n.type} tone={n.user_id ? 'accent' : 'gold'} />
                  <AppText variant="small" tone="faint">
                    {relative(n.created_at)}
                  </AppText>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <BottomSheet visible={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open ? (
          <>
            <View style={styles.row}>
              <Badge label={NOTIFICATION_TYPE_LABEL[open.type] ?? open.type} tone={open.user_id ? 'accent' : 'gold'} />
              <AppText variant="caption" tone="faint">
                {dateTime(open.publish_at ?? open.created_at)}
              </AppText>
            </View>
            {open.image_url ? <Image source={{ uri: open.image_url }} style={styles.image} resizeMode="cover" /> : null}
            <AppText selectable>{open.message}</AppText>
            {hasTarget(open.type) ? (
              <Button
                title="Холбогдох хэсэг рүү очих"
                icon="arrow-forward-circle-outline"
                variant="secondary"
                onPress={() => {
                  const target = open;
                  setOpen(null);
                  openNotificationTarget(navigation, role, { type: target.type });
                }}
              />
            ) : null}
            {open.created_by_name ? (
              <AppText variant="caption" tone="muted">
                Нийтэлсэн: {open.created_by_name}
              </AppText>
            ) : null}
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}

export function AnnouncementsScreen() {
  return <NotificationsScreen initialTab="announcements" />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  image: { width: '100%', height: 180, borderRadius: radius.md },
});
