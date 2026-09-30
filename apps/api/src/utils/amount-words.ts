/**
 * Тоог монгол үгээр бичнэ — албан баримт (төлбөрийн баримт, нэхэмжлэл)-д шаардлагатай.
 * Жишээ: 1250000 → "нэг сая хоёр зуун тавин мянган төгрөг"
 *
 * Монгол хэлэнд тоо нь нэр дагавал холбоосын ("-н") хэлбэрт орно:
 *   гурав → гурван, арав → арван, мянга → мянган.
 * Тоо өгүүлбэрийн төгсгөлд байвал жирийн хэлбэрээр хэлнэ.
 */

/** Төгсгөлийн (жирийн) хэлбэр */
const ONES = ['', 'нэг', 'хоёр', 'гурав', 'дөрөв', 'тав', 'зургаа', 'долоо', 'найм', 'ес'];
const TENS = ['', 'арав', 'хорь', 'гуч', 'дөч', 'тавь', 'жар', 'дал', 'ная', 'ер'];
/** Холбоосын хэлбэр — дараа нь өөр тоо эсвэл нэр дагах үед */
const ONES_ATTR = ['', 'нэг', 'хоёр', 'гурван', 'дөрвөн', 'таван', 'зургаан', 'долоон', 'найман', 'есөн'];
const TENS_ATTR = ['', 'арван', 'хорин', 'гучин', 'дөчин', 'тавин', 'жаран', 'далан', 'наян', 'ерэн'];

/** 1–999. `attr` = дараа нь өөр бүлэг эсвэл нэр дагах эсэх */
function under1000(n: number, attr: boolean): string {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;

  if (h) out.push(`${ONES_ATTR[h]} зуун`);
  // Аравт нь дараа нь нэгж эсвэл нэр дагавал холбоосын хэлбэр
  if (t) out.push(o || attr ? TENS_ATTR[t] : TENS[t]);
  if (o) out.push(attr ? ONES_ATTR[o] : ONES[o]);
  return out.join(' ');
}

/** [нэгж, төгсгөлийн хэлбэр, холбоосын хэлбэр] */
const GROUPS: [number, string, string][] = [
  [1_000_000_000, 'тэрбум', 'тэрбум'],
  [1_000_000, 'сая', 'сая'],
  [1_000, 'мянга', 'мянган'],
];

/**
 * Бүхэл тоог монгол үгээр.
 * @param attributive дараа нь нэр (жишээ нь "төгрөг") дагах эсэх
 */
export function numberToMongolian(value: number, attributive = false): string {
  if (!Number.isFinite(value)) return '';
  let n = Math.round(Math.abs(value));
  const sign = value < 0 ? 'хасах ' : '';
  if (n === 0) return `${sign}тэг`;

  const parts: string[] = [];
  for (const [unit, plain, attr] of GROUPS) {
    const count = Math.floor(n / unit);
    if (!count) continue;
    n -= count * unit;
    // Бүлгийн нэр нь дараа нь тоо эсвэл нэр дагавал холбоосын хэлбэр
    parts.push(`${under1000(count, true)} ${n > 0 || attributive ? attr : plain}`.trim());
  }
  if (n > 0) parts.push(under1000(n, attributive));
  return `${sign}${parts.join(' ')}`.replace(/\s+/g, ' ').trim();
}

/** "нэг сая хоёр зуун тавин мянган төгрөг" — баримтад бичих хэлбэр */
export function amountInWords(value: number): string {
  return `${numberToMongolian(value, true)} төгрөг`;
}
