import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { env } from '../constants/env';
import { supabase } from '../services/supabase';

export const OFFLINE_MESSAGE = 'Интернет холболт байхгүй байна. Холболтоо шалгаад дахин оролдоно уу.';

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    // Backend audit log-д эх сурвалжийг MOBILE гэж бүртгэнэ
    'X-Client-Platform': 'mobile',
    'X-Client-OS': Platform.OS,
  },
});

/** Нэвтрэлт бүрэн хүчингүй болоход (refresh ч бүтэлгүйтвэл) дуудагдана */
let onUnauthorized: ((notice?: string) => void) | null = null;
export const setUnauthorizedHandler = (fn: (notice?: string) => void) => {
  onUnauthorized = fn;
};

// Request бүрт Supabase access token хавсаргана
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → session-ийг нэг удаа шинэчилж дахин оролдоно, болохгүй бол Login руу
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;

    // Өөр төхөөрөмжөөс нэвтэрсэн — token шинэчлэх нь утгагүй, шууд гаргана
    if (error.response?.status === 401 && code === 'SESSION_REPLACED') {
      const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
      onUnauthorized?.(message ?? 'Таны бүртгэлээр өөр төхөөрөмжөөс нэвтэрсэн тул энэ нэвтрэлт хаагдлаа.');
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && original && !original._retried && original.headers?.Authorization) {
      original._retried = true;
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && data.session) {
        original.headers.Authorization = `Bearer ${data.session.access_token}`;
        return api.request(original);
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** `{ data }` хэлбэрийн хариуг задлана */
export async function get<T>(url: string, params?: Record<string, unknown>) {
  const res = await api.get<{ data: T }>(url, { params });
  return res.data.data;
}
export async function post<T>(url: string, body?: unknown) {
  const res = await api.post<{ data: T }>(url, body);
  return res.data.data;
}
export async function put<T>(url: string, body?: unknown) {
  const res = await api.put<{ data: T }>(url, body);
  return res.data.data;
}
export async function patch<T>(url: string, body?: unknown) {
  const res = await api.patch<{ data: T }>(url, body);
  return res.data.data;
}
export async function del<T>(url: string) {
  const res = await api.delete<{ data: T }>(url);
  return res.data.data;
}

export function isNetworkError(err: unknown) {
  return err instanceof AxiosError && !err.response && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.message === 'Network Error');
}

/**
 * Хэрэглэгчид ойлгомжтой алдааны мессеж (stack trace харуулахгүй — §44)
 */
export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (isNetworkError(err)) return err.code === 'ECONNABORTED' ? 'Сервер хариу өгөхгүй байна. Түр хүлээгээд дахин оролдоно уу.' : OFFLINE_MESSAGE;
    const status = err.response?.status ?? 0;
    const msg = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (status >= 500) return 'Серверт алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.';
    if (msg) return msg;
    if (status === 401) return 'Нэвтрэлтийн хугацаа дууссан байна. Дахин нэвтэрнэ үү.';
    if (status === 403) return 'Энэ үйлдлийг хийх эрх танд байхгүй байна.';
    if (status === 404) return 'Мэдээлэл олдсонгүй.';
    return 'Хүсэлт амжилтгүй боллоо.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Тодорхойгүй алдаа гарлаа.';
}
