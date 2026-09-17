import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const moneyFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatMoney(value: number | null | undefined, withSign = true) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return withSign ? `${moneyFormatter.format(value)}₮` : moneyFormatter.format(value);
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** 2026.09.16 */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 2026.09.16 14:05 */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeAgo(value: string) {
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'Дөнгөж сая';
  if (diff < 3600) return `${Math.floor(diff / 60)} минутын өмнө`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} цагийн өмнө`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} өдрийн өмнө`;
  return formatDate(value);
}

/** "Батсүх Бат" → "Б.Бат" */
export function shortName(fullName: string | null | undefined) {
  if (!fullName) return '—';
  const [last, ...rest] = fullName.trim().split(/\s+/);
  if (!rest.length) return last;
  return `${last.charAt(0)}.${rest.join(' ')}`;
}

export function initials(fullName: string | null | undefined) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  const first = parts[parts.length - 1] ?? '';
  const last = parts[0] ?? '';
  return (last.charAt(0) + first.charAt(0)).toUpperCase();
}

export function hhmm(time: string) {
  return time.slice(0, 5);
}

export function percent(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}
