import { describe, expect, it } from 'vitest';
import { amountInWords, numberToMongolian } from '../src/utils/amount-words';

describe('Тоог монгол үгээр (баримт)', () => {
  it('нэг цифр', () => {
    expect(numberToMongolian(0)).toBe('тэг');
    expect(numberToMongolian(1)).toBe('нэг');
    expect(numberToMongolian(9)).toBe('ес');
  });

  it('аравт — төгсгөлд жирийн, дараа нь цифр орвол холбоос', () => {
    expect(numberToMongolian(10)).toBe('арав');
    expect(numberToMongolian(20)).toBe('хорь');
    expect(numberToMongolian(60)).toBe('жар');
    expect(numberToMongolian(80)).toBe('ная');
    expect(numberToMongolian(25)).toBe('хорин тав');
    expect(numberToMongolian(99)).toBe('ерэн ес');
  });

  it('зуут', () => {
    expect(numberToMongolian(100)).toBe('нэг зуун');
    expect(numberToMongolian(345)).toBe('гурван зуун дөчин тав');
    expect(numberToMongolian(900)).toBe('есөн зуун');
  });

  it('мянга, сая', () => {
    expect(numberToMongolian(1000)).toBe('нэг мянга');
    expect(numberToMongolian(2500)).toBe('хоёр мянган таван зуун');
    expect(numberToMongolian(250_000)).toBe('хоёр зуун тавин мянга');
    expect(numberToMongolian(1_000_000)).toBe('нэг сая');
    expect(numberToMongolian(1_250_000)).toBe('нэг сая хоёр зуун тавин мянга');
  });

  it('нэр дагах үед холбоосын хэлбэр (attributive)', () => {
    expect(numberToMongolian(1000, true)).toBe('нэг мянган');
    expect(numberToMongolian(25, true)).toBe('хорин таван');
    expect(numberToMongolian(100, true)).toBe('нэг зуун');
  });

  it('баримтад бичих хэлбэр', () => {
    expect(amountInWords(1_250_000)).toBe('нэг сая хоёр зуун тавин мянган төгрөг');
    expect(amountInWords(450_000)).toBe('дөрвөн зуун тавин мянган төгрөг');
    expect(amountInWords(3_000_000)).toBe('гурван сая төгрөг');
    expect(amountInWords(0)).toBe('тэг төгрөг');
  });

  it('бутархайг бүхэлчилнэ, сөрөг дүн', () => {
    expect(amountInWords(1500.4)).toBe('нэг мянган таван зуун төгрөг');
    expect(numberToMongolian(-25)).toBe('хасах хорин тав');
  });

  it('тэрбум', () => expect(numberToMongolian(2_000_000_000)).toBe('хоёр тэрбум'));
});
