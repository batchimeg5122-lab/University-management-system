import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/theme.store';
import { darkColors, lightColors, type ThemeColors } from './colors';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26 } as const;

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

/**
 * Идэвхтэй theme:
 * - "system" → утасны Light/Dark тохиргоог дагана
 * - "light" / "dark" → хэрэглэгчийн сонголт (Профайл → Харагдах байдал)
 */
export function useTheme(): Theme {
  const system = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
  return { dark, colors: dark ? darkColors : lightColors };
}

export type { ThemeColors };
