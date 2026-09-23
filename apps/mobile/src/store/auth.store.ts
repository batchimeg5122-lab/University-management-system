import type { Session } from '@supabase/supabase-js';
import { AxiosError } from 'axios';
import { create } from 'zustand';
import { authApi } from '../api/auth.api';
import { errorMessage, isNetworkError, post, setUnauthorizedHandler } from '../api/client';
import { isConfigured } from '../constants/env';
import { unregisterPush } from '../services/notification';
import { cancelClassReminders, cancelExamReminders } from '../services/reminders';
import { useSettingsStore } from './settings.store';
import { persister, queryClient } from '../services/queryClient';
import { CACHE_KEYS, storage } from '../services/storage';
import { supabase } from '../services/supabase';
import type { MobileSession, UserRole } from '../types/models';
import { MOBILE_ROLES } from '../utils/constants';

export type AuthStatus = 'loading' | 'signedOut' | 'mustChangePassword' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  profile: MobileSession | null;
  /** Login дэлгэцэнд харуулах мессеж (жишээ нь session дууссан) */
  notice: string | null;
  /** Сервертэй холбогдоогүй, cache-аас ачаалсан */
  offline: boolean;
  init: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: (notice?: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: MobileSession) => void;
  changePassword: (password: string) => Promise<void>;
  clearNotice: () => void;
}

const NOT_MOBILE_ROLE = 'Mobile App зөвхөн оюутан, багшид зориулагдсан. Бусад эрхээр Web системийг ашиглана уу.';

const mustChange = (session: Session | null) => Boolean(session?.user?.user_metadata?.must_change_password);

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'И-мэйл эсвэл нууц үг буруу байна.';
  if (m.includes('email not confirmed')) return 'И-мэйл баталгаажаагүй байна. Системийн админд хандана уу.';
  if (m.includes('network') || m.includes('fetch')) return 'Интернет холболт байхгүй байна. Холболтоо шалгаад дахин оролдоно уу.';
  if (m.includes('rate limit')) return 'Олон удаа оролдлоо. Түр хүлээгээд дахин оролдоно уу.';
  if (m.includes('password should be')) return 'Нууц үг хэт богино эсвэл энгийн байна.';
  return message;
}

async function wipeLocal() {
  queryClient.clear();
  await Promise.resolve(persister.removeClient()).catch(() => undefined);
  await storage.clearAll();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  profile: null,
  notice: null,
  offline: false,

  clearNotice: () => set({ notice: null }),
  setProfile: (profile) => {
    set({ profile });
    void storage.set(CACHE_KEYS.profile, profile);
  },

  init: async () => {
    if (!isConfigured) return set({ status: 'signedOut' });
    const { data } = await supabase.auth.getSession();
    if (!data.session) return set({ status: 'signedOut' });
    if (mustChange(data.session)) return set({ status: 'mustChangePassword' });
    await get().refreshProfile();
  },

  /** /auth/me-г ачаалж role шалгана. Сүлжээгүй бол cache ашиглана */
  refreshProfile: async () => {
    try {
      const profile = await authApi.me();
      if (!MOBILE_ROLES.includes(profile.user.role as UserRole)) {
        await get().signOut(NOT_MOBILE_ROLE);
        return;
      }
      get().setProfile(profile);
      set({ status: 'signedIn', offline: false });
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await storage.get<MobileSession>(CACHE_KEYS.profile);
        if (cached) return set({ profile: cached, status: 'signedIn', offline: true });
      }
      const status = err instanceof AxiosError ? err.response?.status : undefined;
      if (status === 401 || status === 403) {
        await get().signOut(errorMessage(err));
        return;
      }
      // Session байгаа ч профайл ачаалагдсангүй — Login руу мессежтэй буцна
      await get().signOut(errorMessage(err));
    }
  },

  signIn: async (identifier, password) => {
    if (!isConfigured) throw new Error('Апп-ын тохиргоо (.env) дутуу байна. EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY-г бөглөнө үү.');
    const id = identifier.trim();
    if (!id || !password) throw new Error('И-мэйл/код болон нууц үгээ оруулна уу.');

    let email = id;
    if (!id.includes('@')) {
      try {
        email = (await authApi.lookup(id)).email;
      } catch (err) {
        const status = err instanceof AxiosError ? err.response?.status : undefined;
        if (status === 401 || status === 404) throw new Error('И-мэйл эсвэл нууц үг буруу байна.');
        throw new Error(errorMessage(err));
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (error) throw new Error(translateAuthError(error.message));

    set({ notice: null });
    if (mustChange(data.session)) return set({ status: 'mustChangePassword' });
    await get().refreshProfile();
    // Нэвтрэлтийн түүх (алдаа гарсан ч нэвтрэлтэд нөлөөлөхгүй)
    if (get().status === 'signedIn') void post('/auth/login-event', { platform: 'mobile' }).catch(() => undefined);
    if (get().status !== 'signedIn') throw new Error(get().notice ?? 'Нэвтэрч чадсангүй.');
  },

  changePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    if (error) throw new Error(translateAuthError(error.message));
    await supabase.auth.refreshSession();
    await get().refreshProfile();
  },

  signOut: async (notice = null) => {
    await unregisterPush().catch(() => undefined);
    await cancelClassReminders();
    await cancelExamReminders();
    // Дараагийн хэрэглэгчид өмнөхийн биометр түгжээ үйлчлэхгүй
    useSettingsStore.getState().update({ biometricEnabled: false });
    useSettingsStore.getState().unlock();
    await supabase.auth.signOut().catch(() => undefined);
    await wipeLocal();
    set({ status: 'signedOut', profile: null, offline: false, notice });
  },
}));

// Token сэргээгдэхгүй болсон (401) үед Login руу шилжинэ
setUnauthorizedHandler((notice) => {
  if (useAuthStore.getState().status !== 'signedOut') {
    void useAuthStore.getState().signOut(notice ?? 'Нэвтрэлтийн хугацаа дууссан байна. Дахин нэвтэрнэ үү.');
  }
});

// Өөр төхөөрөмж/сервер талаас session устгагдвал
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && useAuthStore.getState().status === 'signedIn') {
    void wipeLocal().then(() => useAuthStore.setState({ status: 'signedOut', profile: null }));
  }
});

/** Туслах selector-ууд */
export const useProfile = () => useAuthStore((s) => s.profile);
export const useRole = () => useAuthStore((s) => s.profile?.user.role ?? null);
