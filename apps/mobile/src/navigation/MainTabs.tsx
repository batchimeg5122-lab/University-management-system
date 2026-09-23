import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentType } from 'react';
import { BRAND } from '../constants/env';
import { useNotifications } from '../hooks/queries';
import { useClassReminders } from '../hooks/useClassReminders';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtime';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { ScheduleScreen } from '../screens/common/ScheduleScreen';
import { useAuthStore } from '../store/auth.store';
import { useTheme } from '../theme';
import { tabOptions } from './options';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Home: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Courses: ComponentType<any>;
  /** Оюутан: Home/Schedule/Courses, Багш: Home/Courses/Schedule (§7, §27) */
  order: (keyof TabParamList)[];
}

/** Bottom Navigation — Realtime, Push бүртгэл энд идэвхжинэ */
export function MainTabs({ Home, Courses, order }: Props) {
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.profile?.user.id);
  const unread = (useNotifications().data ?? []).filter((n) => n.user_id && !n.is_read).length;

  useRealtimeNotifications(userId);
  usePushNotifications(!!userId);
  useClassReminders();

  const screens: Record<keyof TabParamList, { component: ComponentType<object>; title: string; tab: string }> = {
    HomeTab: { component: Home, title: BRAND.name, tab: 'Нүүр' },
    ScheduleTab: { component: ScheduleScreen, title: 'Хичээлийн хуваарь', tab: 'Хуваарь' },
    CoursesTab: { component: Courses, title: 'Миний хичээл', tab: 'Хичээл' },
    NotificationsTab: { component: NotificationsScreen, title: 'Мэдэгдэл', tab: 'Мэдэгдэл' },
    ProfileTab: { component: ProfileScreen, title: 'Профайл', tab: 'Профайл' },
  };

  return (
    <Tab.Navigator screenOptions={({ route }) => tabOptions(colors, route.name)}>
      {order.map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={screens[name].component}
          options={{
            title: screens[name].title,
            tabBarLabel: screens[name].tab,
            tabBarAccessibilityLabel: screens[name].tab,
            ...(name === 'NotificationsTab' && unread ? { tabBarBadge: unread > 99 ? '99+' : unread } : {}),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
