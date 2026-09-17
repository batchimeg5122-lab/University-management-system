import axios, { AxiosError } from 'axios';
import { env } from './env';
import { supabase } from './supabase';
import { mockAdapter } from './mock/adapter';
import { supabaseAdapter } from './supabase-adapter';

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

if (env.dataSource === 'mock') {
  api.defaults.adapter = mockAdapter;
} else if (env.dataSource === 'supabase') {
  api.defaults.adapter = supabaseAdapter;
} else {
  // Supabase access token-ийг Express API руу дамжуулна
  api.interceptors.request.use(async (config) => {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const token = data.session?.access_token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

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

export function errorMessage(err: unknown) {
  if (err instanceof AxiosError) {
    const msg = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (msg) return msg;
    if (err.code === 'ERR_NETWORK') return 'Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгана уу.';
    return err.message;
  }
  return err instanceof Error ? err.message : 'Тодорхойгүй алдаа гарлаа.';
}
