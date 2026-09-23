import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Төхөөрөмжийн тохиргоо — logout хийхэд ч хадгалагдана
 * (`ikz.` prefix-гүй тусдаа key, storage.clearAll()-д өртөхгүй).
 */
const KEY = 'app-settings';

export const REMINDER_OPTIONS = [5, 10, 15, 30] as const;
export type ReminderMinutes = (typeof REMINDER_OPTIONS)[number];

interface Persisted {
  /** Танилцуулга үзсэн эсэх */
  onboarded: boolean;
  /** Face ID / хурууны хээгээр түгжих */
  biometricEnabled: boolean;
  /** Хичээл эхлэхийн өмнөх сануулга */
  reminderEnabled: boolean;
  reminderMinutes: ReminderMinutes;
}

interface SettingsState extends Persisted {
  hydrated: boolean;
  /** Апп түгжигдсэн эсэх (хадгалагдахгүй) */
  locked: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Persisted>) => void;
  lock: () => void;
  unlock: () => void;
}

const DEFAULTS: Persisted = { onboarded: false, biometricEnabled: false, reminderEnabled: false, reminderMinutes: 15 };

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  locked: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
      const next = { ...DEFAULTS, ...saved };
      // Апп шинээр нээгдэхэд биометр асаалттай бол түгжинэ
      set({ ...next, locked: next.biometricEnabled, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  update: (patch) => {
    set(patch);
    const { onboarded, biometricEnabled, reminderEnabled, reminderMinutes } = { ...get(), ...patch };
    void AsyncStorage.setItem(KEY, JSON.stringify({ onboarded, biometricEnabled, reminderEnabled, reminderMinutes })).catch(() => undefined);
  },

  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false }),
}));
