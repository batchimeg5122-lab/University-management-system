import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi, type Room, type RoomFilters } from './api';

export const useRooms = (filters: RoomFilters = {}) =>
  useQuery({ queryKey: ['rooms', filters], queryFn: () => roomsApi.list(filters), placeholderData: (p) => p });

export function useSaveRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Room> & { id?: string }) => (id ? roomsApi.update(id, body) : roomsApi.create(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}
