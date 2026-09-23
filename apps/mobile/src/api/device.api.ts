import { post } from './client';

export const deviceApi = {
  register: (body: { token: string; platform: string; device_name?: string | null }) => post<{ id: string }>('/devices', body),
  unregister: (token: string) => post<{ deleted: boolean }>('/devices/unregister', { token }),
};
