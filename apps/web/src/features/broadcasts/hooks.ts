import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { broadcastsApi } from './api';

export const useBroadcasts = () => useQuery({ queryKey: ['broadcasts'], queryFn: broadcastsApi.list, refetchInterval: 30_000 });

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: broadcastsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }) });
}

export function useDeleteBroadcast() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: broadcastsApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ['broadcasts'] }) });
}
