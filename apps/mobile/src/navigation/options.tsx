import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, type Theme as NavTheme } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { ThemeColors } from '../theme';
import type { TabParamList } from './types';

export function navTheme(dark: boolean, colors: ThemeColors): NavTheme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };
}

export function stackOptions(colors: ThemeColors): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.accent,
    headerTitleStyle: { color: colors.text, fontWeight: '600' },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.background },
  };
}

const TAB_ICON: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  HomeTab: ['home', 'home-outline'],
  ScheduleTab: ['calendar', 'calendar-outline'],
  CoursesTab: ['book', 'book-outline'],
  NotificationsTab: ['notifications', 'notifications-outline'],
  ProfileTab: ['person-circle', 'person-circle-outline'],
};

export function tabOptions(colors: ThemeColors, name: keyof TabParamList): BottomTabNavigationOptions {
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTitleStyle: { color: colors.text, fontWeight: '600' },
    headerShadowVisible: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.faint,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarIcon: ({ focused, color, size }) => <Ionicons name={TAB_ICON[name][focused ? 0 : 1]} color={color} size={size} />,
  };
}
