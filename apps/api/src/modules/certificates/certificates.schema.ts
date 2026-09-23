import { z } from 'zod';

export const CERT_PURPOSE = {
  bank: 'Банк, зээлийн байгууллагад',
  military: 'Цэргийн бүртгэлд',
  visa: 'Виз, гадаад паспортад',
  work: 'Ажлын байранд',
  social: 'Нийгмийн даатгал, халамжид',
  dormitory: 'Дотуур байранд',
  other: 'Бусад',
} as const;

export const createCertificateSchema = z.object({
  purpose: z.enum(Object.keys(CERT_PURPOSE) as [keyof typeof CERT_PURPOSE]).default('other'),
  purpose_note: z.string().trim().max(200).optional().nullable().or(z.literal('').transform(() => null)),
  /** Голч дүн, кредитийг тодорхойлолтод оруулах эсэх */
  include_gpa: z.boolean().default(false),
  /** Хүчинтэй хугацаа, хоногоор (анхдагч 30) */
  valid_days: z.coerce.number().int().min(1).max(365).default(30),
});

export const listCertificatesQuery = z.object({
  student_id: z.string().uuid().optional().or(z.literal('')),
  q: z.string().optional(),
});
