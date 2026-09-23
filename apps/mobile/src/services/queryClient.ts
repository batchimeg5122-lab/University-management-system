import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { CACHE_KEYS } from './storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24, // 24 цаг — offline cache-д хэрэгтэй
      retry: (count, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online', retry: 0 },
  },
});

/**
 * Offline үед харагдах мэдээлэл (шаардлага §43):
 * профайл, хичээлийн жагсаалт, хуваарь, мэдэгдэл, багшийн dashboard.
 * Санхүү, дүн зэрэг мэдрэг мэдээллийг утсанд хадгалахгүй.
 */
export const PERSISTED_QUERY_ROOTS = ['me', 'courses', 'schedules', 'notifications', 'teacher-dashboard', 'student-card', 'exams', 'calendar'];

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: `ikz.${CACHE_KEYS.queryCache}`,
  throttleTime: 2000,
});

// NetInfo → react-query online төлөв
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  }),
);

// App дахин идэвхжихэд stale query-г шинэчилнэ
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
}
