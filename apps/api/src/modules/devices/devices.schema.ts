import { z } from 'zod';

export const registerDeviceSchema = z.object({
  token: z
    .string()
    .trim()
    .min(10, 'Push token буруу байна')
    .max(300)
    .refine((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t), 'Expo push token биш байна'),
  platform: z.enum(['ios', 'android', 'web']).default('android'),
  device_name: z.string().trim().max(120).optional().nullable(),
});

export const unregisterDeviceSchema = z.object({
  token: z.string().trim().min(10).max(300),
});
