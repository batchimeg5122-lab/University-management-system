import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function apply(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E131B' : '#F6F7F9');
}

/** Систем / Цайвар / Бараан — localStorage-д хадгална (index.html урьдчилан тогтооно) */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem(KEY) as ThemeMode) || 'system');

  useEffect(() => {
    apply(mode);
    if (mode !== 'system') return;
    const m = media();
    const onChange = () => apply('system');
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(KEY, m);
    setModeState(m);
  }, []);

  const cycle = useCallback(() => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'), [mode, setMode]);
  return { mode, setMode, cycle };
}
