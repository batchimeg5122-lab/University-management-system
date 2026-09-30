import { DAY_LABEL } from './constants';

/** 4500000 → 4,500,000₮ */
export function money(n: number | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  return `${v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}₮`;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  // "2026-09-21" → local date (UTC болгож хөрвүүлэхгүй)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(v);
}

/** 2026.09.21 */
export function date(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 09/21 */
export function shortDate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = toDate(v);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

/** 2026.09.21 14:05 */
export function dateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${date(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "08:00:00" → "08:00" */
export const time = (t: string | null | undefined) => (t ? t.slice(0, 5) : '—');

/** Хэдэн минутын/цагийн өмнө */
export function relative(v: string | null | undefined): string {
  if (!v) return '';
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  if (diff < 60) return 'Дөнгөж сая';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин өмнө`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} цагийн өмнө`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} өдрийн өмнө`;
  return date(v);
}

export function bytes(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}

export const percent = (n: number | null | undefined, digits = 0) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(digits)}%`);

export const gpa = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Number(n).toFixed(2));

/** Утасны локал огноо YYYY-MM-DD */
export function isoDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** 1 = Даваа ... 7 = Ням */
export function weekday(d = new Date()): number {
  const w = d.getDay();
  return w === 0 ? 7 : w;
}

export function dayLabelOf(iso: string): string {
  return DAY_LABEL[weekday(toDate(iso))] ?? '';
}

/**
 * Тухайн гарагийн хамгийн дараагийн огноо (өнөөдөр орно).
 * Жишээ: Өнөөдөр Лхагва бол Лхагвагийн (3) огноо = өнөөдөр, Даваа (1) = дараа долоо хоног.
 */
export function nextDateOfWeekday(dow: number, from = new Date()): string {
  const diff = (dow - weekday(from) + 7) % 7;
  return addDays(isoDate(from), diff);
}

/** "Бат Дорж" → "БД" */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

/** "Батын Дорж" → "Б.Дорж" */
export function shortName(full: string | null | undefined, last?: string | null, first?: string | null): string {
  if (last && first) return `${last.charAt(0)}.${first}`;
  if (!full) return '—';
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0].charAt(0)}.${parts.slice(1).join(' ')}` : full;
}
