import Constants from 'expo-constants';

/**
 * .env (EXPO_PUBLIC_*) тохиргоо.
 * EXPO_PUBLIC_API_URL тохируулаагүй бол Expo dev серверийн IP-г ашиглаж
 * http://<компьютерийн IP>:4000/api гэж автоматаар таамаглана (утсан дээр localhost ажиллахгүй).
 */
/** Expo dev серверийн (компьютерийн) IP — Wi-Fi солигдоход автоматаар шинэчлэгдэнэ */
function devHost(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  return hostUri.split(':')[0] || 'localhost';
}

const guessDevApiUrl = () => `http://${devHost()}:4000/api`;
const guessDevWebUrl = () => `http://${devHost()}:5173`;

const trimSlash = (v: string) => v.trim().replace(/\/+$/, '');

export const env = {
  apiUrl: trimSlash(process.env.EXPO_PUBLIC_API_URL || guessDevApiUrl()),
  supabaseUrl: trimSlash(process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''),
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
  /** Тодорхойлолтын QR код энэ хаяг руу заана: <WEB_URL>/verify/<code> */
  webUrl: trimSlash(process.env.EXPO_PUBLIC_WEB_URL || guessDevWebUrl()),
  /** EAS projectId — push token авахад шаардлагатай */
  easProjectId:
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    '',
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const BRAND = {
  name: 'Их Засаг Их Сургууль',
  shortName: 'Их Засаг',
};
