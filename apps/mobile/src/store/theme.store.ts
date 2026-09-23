import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Харагдах байдлын тохиргоо (Систем / Цайвар / Бараан).
 * Logout хийхэд устгагдахгүй — `ikz.` prefix-гүй тусдаа key-д хадгална.
 */
const KEY = 'theme-mode';

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
}

/** Native хэсгүүд (Alert, гар, системийн цонх) ч мөн адил өнгөтэй болно */
function applyNative(mode: ThemeMode) {
  if (Platform.OS === 'web') return;
  try {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  } catch {
    /* хуучин төхөөрөмж дээр дэмжигдэхгүй байж болно */
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  hydrated: false,

  hydrate: async () => {
    try {
      const saved = (await AsyncStorage.getItem(KEY)) as ThemeMode | null;
      const mode: ThemeMode = saved === 'light' || saved === 'dark' ? saved : 'system';
      applyNative(mode);
      set({ mode, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setMode: (mode) => {
    applyNative(mode);
    set({ mode });
    void AsyncStorage.setItem(KEY, mode).catch(() => undefined);
  },
}));
