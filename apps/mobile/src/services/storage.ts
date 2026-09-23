import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Энгийн (нууц биш) local cache.
 * Нууц мэдээлэл (token) → secureStorage.ts
 */
const PREFIX = 'ikz.';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown) {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* cache бичиж чадаагүй ч апп ажиллана */
    }
  },
  async remove(key: string) {
    await AsyncStorage.removeItem(PREFIX + key).catch(() => undefined);
  },
  /** Logout үед бүх local cache-г цэвэрлэнэ */
  async clearAll() {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  },
};

export const CACHE_KEYS = {
  profile: 'profile',
  queryCache: 'query-cache',
  pushToken: 'push-token',
} as const;
