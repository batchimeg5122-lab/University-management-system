import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Supabase session-ийг SecureStore (iOS Keychain / Android Keystore)-д хадгална.
 * SecureStore нэг утгад ~2KB хязгаартай тул JWT session-ийг хэсэгчлэн (chunk) хадгална.
 * Web дээр SecureStore байхгүй тул AsyncStorage ашиглана.
 */
const CHUNK_SIZE = 1800;
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const countKey = (key: string) => `${safeKey(key)}__n`;
const partKey = (key: string, i: number) => `${safeKey(key)}__${i}`;

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return AsyncStorage.getItem(key);
  const n = await SecureStore.getItemAsync(countKey(key));
  if (n === null) return SecureStore.getItemAsync(safeKey(key));
  const count = Number(n);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(partKey(key, i));
    if (part === null) return null; // эвдэрсэн бол session байхгүй гэж үзнэ
    parts.push(part);
  }
  return parts.join('');
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) return AsyncStorage.removeItem(key);
  const n = await SecureStore.getItemAsync(countKey(key));
  const count = n === null ? 0 : Number(n);
  await Promise.all([
    ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(partKey(key, i))),
    SecureStore.deleteItemAsync(countKey(key)),
    SecureStore.deleteItemAsync(safeKey(key)),
  ]);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) return AsyncStorage.setItem(key, value);
  await removeItem(key);
  const parts: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) parts.push(value.slice(i, i + CHUNK_SIZE));
  await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(partKey(key, i), p)));
  await SecureStore.setItemAsync(countKey(key), String(parts.length));
}

export const secureStorage = { getItem, setItem, removeItem };
