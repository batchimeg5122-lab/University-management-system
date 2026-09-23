import { get, post } from '@/lib/api';
import type { StudentCertificate } from '@/types/models';

export const CERT_PURPOSE: Record<string, string> = {
  bank: 'Банк, зээлийн байгууллагад',
  military: 'Цэргийн бүртгэлд',
  visa: 'Виз, гадаад паспортад',
  work: 'Ажлын байранд',
  social: 'Нийгмийн даатгал, халамжид',
  dormitory: 'Дотуур байранд',
  other: 'Бусад',
};

export type CertificateInput = {
  purpose: string;
  purpose_note?: string | null;
  include_gpa: boolean;
  valid_days: number;
};

export type VerifyResult = {
  number: string;
  full_name: string | null;
  student_code: string | null;
  program_name: string | null;
  class_name: string | null;
  status: string | null;
  issued_at: string;
  valid_until: string | null;
  is_valid: boolean;
  revoked: boolean;
};

export const certificatesApi = {
  mine: () => get<StudentCertificate[]>('/certificates/me'),
  detail: (id: string) => get<StudentCertificate>(`/certificates/${id}`),
  create: (body: CertificateInput) => post<StudentCertificate>('/certificates', body),
  list: (params: { q?: string; student_id?: string } = {}) => get<StudentCertificate[]>('/certificates', params),
  revoke: (id: string) => post<StudentCertificate>(`/certificates/${id}/revoke`),
  verify: (code: string) => get<VerifyResult>(`/certificates/verify/${encodeURIComponent(code)}`),
};
