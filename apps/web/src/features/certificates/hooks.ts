import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { certificatesApi, type CertificateInput } from './api';

export const useMyCertificates = () => useQuery({ queryKey: ['certificates', 'me'], queryFn: certificatesApi.mine });

export const useCertificates = (params: { q?: string } = {}) =>
  useQuery({ queryKey: ['certificates', params], queryFn: () => certificatesApi.list(params) });

export function useCreateCertificate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: CertificateInput) => certificatesApi.create(b), onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }) });
}

export function useRevokeCertificate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => certificatesApi.revoke(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }) });
}
