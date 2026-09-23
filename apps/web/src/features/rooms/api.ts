import { get, patch, post } from '@/lib/api';

export interface Room {
  id: string;
  building: string;
  code: string;
  capacity: number;
  room_type: 'lecture' | 'seminar' | 'lab' | 'other';
  note: string | null;
  is_active: boolean;
  /** Сонгосон цагт эзэлсэн эсэх */
  busy?: boolean;
  busy_with?: string | null;
  weekly_sessions?: number;
}

export type RoomFilters = {
  building?: string;
  room_type?: string;
  semester_id?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
};

export const ROOM_TYPE_LABEL: Record<Room['room_type'], string> = {
  lecture: 'Лекцийн танхим',
  seminar: 'Семинарын өрөө',
  lab: 'Лаборатори',
  other: 'Бусад',
};

export const roomsApi = {
  list: (params: RoomFilters = {}) => get<Room[]>('/rooms', params),
  create: (body: Partial<Room>) => post<Room>('/rooms', body),
  update: (id: string, body: Partial<Room>) => patch<Room>(`/rooms/${id}`, body),
};
