import { NavigationContainer } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLock, ToastProvider } from './src/components';
import { navTheme } from './src/navigation/options';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PERSISTED_QUERY_ROOTS, persister, queryClient } from './src/services/queryClient';
import { useAuthStore } from './src/store/auth.store';
import { useSettingsStore } from './src/store/settings.store';
import { useThemeStore } from './src/store/theme.store';
import { useTheme } from './src/theme';

export default function App() {
  const { dark, colors } = useTheme();
  const init = useAuthStore((s) => s.init);
  const hydrated = useThemeStore((s) => s.hydrated);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const settingsReady = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateTheme();
    void hydrateSettings();
    void init();
  }, [init, hydrateTheme, hydrateSettings]);

  // Хадгалсан theme, тохиргоог уншихаас өмнө зурахгүй (анивчих, түгжээ алгасахаас сэргийлнэ)
  if (!hydrated || !settingsReady) return null;

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 хоног
          buster: 'v1',
          dehydrateOptions: {
            // Зөвхөн offline-д хэрэгтэй, мэдрэг бус мэдээллийг утсанд хадгална (§43)
            shouldDehydrateQuery: (q) => q.state.status === 'success' && PERSISTED_QUERY_ROOTS.includes(String(q.queryKey[0])),
          },
        }}
      >
        <ToastProvider>
          <NavigationContainer theme={navTheme(dark, colors)}>
            <StatusBar style={dark ? 'light' : 'dark'} />
            <RootNavigator />
          </NavigationContainer>
          <AppLock />
        </ToastProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
