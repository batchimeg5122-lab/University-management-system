/** Монголын цагийн бүс (UTC+8) — сервер өөр бүсэд байсан ч "өнөөдөр" зөв бодогдоно */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Ulaanbaatar';

/** YYYY-MM-DD */
export function localDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** 1 = Даваа ... 7 = Ням */
export function localWeekday(d = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' }).format(d);
  return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[name] ?? 1;
}
