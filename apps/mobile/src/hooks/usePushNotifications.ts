import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import type { AppStackParamList } from '../navigation/types';
import { clearBadge, registerForPush } from '../services/notification';
import { useAuthStore } from '../store/auth.store';
import { openNotificationTarget, type NotificationData } from '../utils/notificationRoute';
import { qk } from './queries';

/**
 * Нэвтэрсний дараа push бүртгэнэ.
 * Мэдэгдэл (push эсвэл хичээлийн сануулга) дээр дарахад ТОХИРОХ дэлгэц рүү шилжинэ:
 * дүн → Дүн, хуваарь → Хуваарь, төлбөр → Санхүү, зарлал → Зарлал ...
 * Апп хаалттай байхад дарсан мэдэгдэл ч (cold start) ажиллана.
 */
export function usePushNotifications(enabled: boolean) {
  const qc = useQueryClient();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const role = useAuthStore((s) => s.profile?.user.role);
  const registered = useRef(false);
  const handled = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!enabled || registered.current) return;
    registered.current = true;
    void registerForPush();
    void clearBadge();
  }, [enabled]);

  // Апп нээлттэй үед ирсэн push → жагсаалтыг шинэчилнэ
  useEffect(() => {
    if (!enabled) return;
    const sub = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ queryKey: qk.notifications });
    });
    return () => sub.remove();
  }, [enabled, qc]);

  // Мэдэгдэл дээр дарсан → холбогдох дэлгэц
  useEffect(() => {
    if (!enabled || !lastResponse || !role) return;
    const key = `${lastResponse.notification.request.identifier}:${lastResponse.notification.date}`;
    if (handled.current === key) return;
    handled.current = key;

    qc.invalidateQueries({ queryKey: qk.notifications });
    const data = lastResponse.notification.request.content.data as NotificationData | undefined;
    try {
      openNotificationTarget(navigation, role, data);
    } catch {
      /* navigator бэлэн биш */
    }
    void Notifications.clearLastNotificationResponseAsync?.().catch(() => undefined);
  }, [enabled, lastResponse, role, navigation, qc]);
}
