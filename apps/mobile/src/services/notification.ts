import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { deviceApi } from '../api/device.api';
import { env } from '../constants/env';
import { CACHE_KEYS, storage } from './storage';

// App нээлттэй үед ирсэн мэдэгдлийг ч banner-аар харуулна
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Push notification бүртгэл.
 * - Зөвхөн жинхэнэ утсан дээр ажиллана (emulator биш)
 * - Android дээр Expo Go push дэмжихгүй → development build (eas build) шаардлагатай
 * - EAS projectId (app.json → extra.eas.projectId) шаардлагатай
 * Амжилтгүй болсон ч апп-ын бусад хэсэг хэвийн ажиллана.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return null;
    if (isExpoGo && Platform.OS === 'android') {
      console.info('[push] Android Expo Go push дэмжихгүй — development build ашиглана уу.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Их Засаг',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E4B8F',
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;

    if (!env.easProjectId) {
      console.info('[push] EAS projectId тохируулаагүй (npx eas init) — push алгасав.');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId })).data;
    await deviceApi.register({ token, platform: Platform.OS, device_name: Device.deviceName ?? Device.modelName ?? null });
    await storage.set(CACHE_KEYS.pushToken, token);
    return token;
  } catch (err) {
    console.warn('[push] бүртгэж чадсангүй:', (err as Error).message);
    return null;
  }
}

/** Logout үед энэ утсанд push ирэхээ болино */
export async function unregisterPush() {
  const token = await storage.get<string>(CACHE_KEYS.pushToken);
  if (!token) return;
  await deviceApi.unregister(token).catch(() => undefined);
  await storage.remove(CACHE_KEYS.pushToken);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0).catch(() => undefined);
}
