import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AxiosError } from 'axios';
import { errorMessage, get, post } from '@/lib/api';
import { env } from '@/lib/env';
import { MOCK_SESSION_KEY } from '@/lib/mock/handlers';
import { queryClient } from '@/lib/query-client';
import { clearSupabaseSessionCache } from '@/lib/supabase-adapter';
import { supabase } from '@/lib/supabase';
import type { Session, UserRole } from '@/types/models';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  /** И-мэйл эсвэл оюутны код + нууц үг */
  signIn: (identifier: string, password: string) => Promise<Session>;
  /** Зөвхөн VITE_USE_MOCK=true үед */
  signInDemo: (role: UserRole) => Promise<Session>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const fetchMe = () => get<Session>('/auth/me');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSession(await fetchMe());
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (env.useMock) {
        if (sessionStorage.getItem(MOCK_SESSION_KEY)) await load();
      } else if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          try {
            setSession(await fetchMe());
          } catch (err) {
            console.error('[auth]', errorMessage(err));
            // Зөвхөн эрхийн алдаанд гаргана. API түр унтарсан (network) үед session-ийг хадгална.
            const status = err instanceof AxiosError ? err.response?.status : undefined;
            if (status === 401 || status === 403) await supabase.auth.signOut();
            setSession(null);
          }
        }
      }
      if (active) setLoading(false);
    })();

    if (!env.useMock && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') setSession(null);
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') void load();
      });
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    }
    return () => {
      active = false;
    };
  }, [load]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (env.useMock) throw new Error('Туршилтын горимд доорх эрхүүдээс сонгож нэвтэрнэ үү.');
    if (!supabase) throw new Error('Supabase тохиргоо (.env) дутуу байна.');

    let email = identifier.trim();
    if (!email.includes('@') && env.dataSource === 'supabase') {
      throw new Error('Оюутны кодоор нэвтрэхэд backend шаардлагатай. И-мэйл хаягаа оруулна уу.');
    }
    if (!email.includes('@')) {
      // Оюутны код / ажилтны кодоор нэвтрэх — backend и-мэйлийг олж өгнө
      const res = await post<{ email: string }>('/auth/lookup', { identifier: email });
      email = res.email;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === 'email_not_confirmed' || error.message === 'Email not confirmed') {
        throw new Error('Таны нэвтрэх эрх баталгаажаагүй байна. Системийн админд хандаж эрхээ баталгаажуулуулна уу.');
      }
      if (code === 'user_banned' || /banned/i.test(error.message)) {
        throw new Error('Таны эрх идэвхгүй болсон байна. Системийн админд хандана уу.');
      }
      if (code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
        throw new Error('И-мэйл/код эсвэл нууц үг буруу байна.');
      }
      if (/rate limit/i.test(error.message)) throw new Error('Хэт олон удаа оролдлоо. Хэдэн минут хүлээгээд дахин оролдоно уу.');
      throw new Error(error.message);
    }
    clearSupabaseSessionCache();
    let me: Session;
    try {
      me = await fetchMe();
    } catch (err) {
      // users хүснэгтэд бүртгэлгүй эсвэл API ажиллахгүй бол Auth session-ийг цэвэрлэж, шалтгааныг харуулна
      await supabase.auth.signOut();
      if (err instanceof AxiosError && err.code === 'ERR_NETWORK') {
        throw new Error(`API сервертэй холбогдож чадсангүй (${env.apiUrl}). apps/api дотор "npm run dev" ажиллаж байгаа эсэхийг шалгана уу.`);
      }
      throw err;
    }
    setSession(me);
    return me;
  }, []);

  const signInDemo = useCallback(async (role: UserRole) => {
    sessionStorage.setItem(MOCK_SESSION_KEY, role);
    queryClient.clear();
    const me = await fetchMe();
    setSession(me);
    return me;
  }, []);

  const signOut = useCallback(async () => {
    if (env.useMock) sessionStorage.removeItem(MOCK_SESSION_KEY);
    else await supabase?.auth.signOut();
    clearSupabaseSessionCache();
    queryClient.clear();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, loading, signIn, signInDemo, signOut, refresh: load }), [session, loading, signIn, signInDemo, signOut, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
