export type UserRole = 'super_admin' | 'management' | 'academic' | 'finance' | 'teacher' | 'student';

export const ROLES = ['super_admin', 'management', 'academic', 'finance', 'teacher', 'student'] as const;
export const STAFF: UserRole[] = ['super_admin', 'management', 'academic', 'finance'];

export const DEFAULT_GRADE_ITEMS: [string, number][] = [
  ['Ирц', 10],
  ['Явцын шалгалт', 20],
  ['Бие даалт', 10],
  ['Дунд шалгалт', 20],
  ['Эцсийн шалгалт', 40],
];
