import { get, post } from './client';
import type { StudentCertificate, VerifyResult } from '../types/models';

export type CertificateInput = { purpose: string; purpose_note?: string | null; include_gpa: boolean; valid_days: number };

export const certificateApi = {
  mine: () => get<StudentCertificate[]>('/certificates/me'),
  detail: (id: string) => get<StudentCertificate>(`/certificates/${id}`),
  create: (body: CertificateInput) => post<StudentCertificate>('/certificates', body),
  /** Нээлттэй — нэвтрэх шаардлагагүй */
  verify: (code: string) => get<VerifyResult>(`/certificates/verify/${encodeURIComponent(code.trim())}`),
};
