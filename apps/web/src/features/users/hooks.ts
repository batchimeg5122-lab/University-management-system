import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppUser } from '@/types/models';
import { usersApi, type UserFilters, type UserUpdateInput } from './api';

export const useUsers = (params: UserFilters) => useQuery({ queryKey: ['users', params], queryFn: () => usersApi.list(params) });

export const useUser = (id: string | undefined) =>
  useQuery({ queryKey: ['users', 'detail', id], queryFn: () => usersApi.detail(id!), enabled: !!id });

/** Шинэ хэрэглэгч үүсгэх */
export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<AppUser> & { password?: string }) => usersApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

/** Бүх мэдээллийг (оюутан/ажилтны профайлтай) засах */
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UserUpdateInput & { id: string }) => usersApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; password?: string; must_change: boolean }) => usersApi.resetPassword(id, body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['users', 'detail', v.id] }),
  });
}

export function useConfirmEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.confirmEmail(id),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: ['users', 'detail', id] }),
  });
}

export function useConfirmAllEmails() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => usersApi.confirmAllEmails(), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
}
