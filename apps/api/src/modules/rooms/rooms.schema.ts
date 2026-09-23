import { z } from 'zod';

const roomType = z.enum(['lecture', 'seminar', 'lab', 'other']);

export const listRoomsQuery = z.object({
  building: z.string().optional(),
  room_type: roomType.optional().or(z.literal('')),
  /** Тухайн цагт сул эсэхийг тооцох */
  semester_id: z.string().uuid().optional().or(z.literal('')),
  day_of_week: z.coerce.number().int().min(1).max(7).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

export const createRoomSchema = z.object({
  building: z.string().trim().min(1, 'Байр оруулна уу'),
  code: z.string().trim().min(1, 'Өрөөний дугаар оруулна уу'),
  capacity: z.coerce.number().int().min(1, 'Багтаамж 1-ээс их байна').max(2000),
  room_type: roomType.default('lecture'),
  note: z.string().trim().optional().nullable(),
});

export const updateRoomSchema = createRoomSchema.partial().extend({ is_active: z.boolean().optional() });
