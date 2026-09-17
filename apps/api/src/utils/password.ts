import { randomInt } from 'node:crypto';

// Андуурч болох тэмдэгтүүдийг (0/O, 1/l/I) хассан
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGIT = '23456789';

/**
 * Анхны нууц үг: 10 тэмдэгт, том/жижиг үсэг, тоо заавал агуулна.
 * Криптографийн санамсаргүй тоо ашиглана.
 */
export function generateInitialPassword(length = 10) {
  const all = UPPER + LOWER + DIGIT;
  const chars = [UPPER[randomInt(UPPER.length)], LOWER[randomInt(LOWER.length)], DIGIT[randomInt(DIGIT.length)]];
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
