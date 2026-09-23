export type DataSource = 'mock' | 'supabase' | 'api';

/**
 * mock     — туршилтын өгөгдөл (backend, Supabase хэрэггүй)
 * supabase — Supabase руу шууд, RLS-ээр хамгаалагдана (Express API хэрэггүй)
 * api      — Express API (apps/api) ажиллаж байх шаардлагатай
 */
const dataSource: DataSource =
  (import.meta.env.VITE_DATA_SOURCE as DataSource | undefined) ?? (import.meta.env.VITE_USE_MOCK === 'false' ? 'api' : 'mock');

export const env = {
  dataSource,
  useMock: dataSource === 'mock',
  /**
   * VITE_API_URL хоосон бол хуудсыг нээсэн хостыг ашиглана:
   * компьютер дээр → http://localhost:4000/api, утаснаас → http://192.168.x.x:4000/api
   * Ингэснээр Wi-Fi солигдож IP өөрчлөгдсөн ч .env засах шаардлагагүй.
   */
  apiUrl: import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
};
