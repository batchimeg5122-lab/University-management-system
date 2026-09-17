import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, Bell, BookOpen, Building2, CalendarDays, CalendarRange, ClipboardCheck, CreditCard, FileText,
  GraduationCap, LayoutGrid, Megaphone, PieChart, Receipt, ScrollText, School, ShieldCheck, User, UserSquare2, Users, Wallet,
} from 'lucide-react';
import type { UserRole } from '@/types/models';

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
export type NavGroup = { title?: string; items: NavItem[] };

const academicItems: NavItem[] = [
  { to: '/academic/students', label: 'Оюутан', icon: GraduationCap },
  { to: '/academic/teachers', label: 'Багш', icon: UserSquare2 },
  { to: '/academic/classes', label: 'Анги', icon: Users },
  { to: '/academic/subjects', label: 'Хичээлийн сан', icon: BookOpen },
  { to: '/academic/courses', label: 'Хичээл хуваарилалт', icon: LayoutGrid },
  { to: '/academic/schedules', label: 'Нэгдсэн хуваарь', icon: CalendarDays },
  { to: '/academic/semesters', label: 'Улирал', icon: CalendarRange },
  { to: '/academic/grades', label: 'Дүн баталгаажуулалт', icon: ClipboardCheck },
  { to: '/academic/announcements', label: 'Зарлал', icon: Megaphone },
];

const financeItems: NavItem[] = [
  { to: '/finance/invoices', label: 'Нэхэмжлэл', icon: Receipt },
  { to: '/finance/payments', label: 'Төлөлт', icon: CreditCard },
  { to: '/finance/reports', label: 'Санхүүгийн тайлан', icon: PieChart },
];

const notifications: NavItem = { to: '/notifications', label: 'Мэдэгдэл', icon: Bell };

export const NAVIGATION: Record<UserRole, NavGroup[]> = {
  super_admin: [
    { items: [{ to: '/admin', label: 'Хяналтын самбар', icon: LayoutGrid, end: true }, notifications] },
    {
      title: 'Систем',
      items: [
        { to: '/admin/users', label: 'Хэрэглэгч, эрх', icon: ShieldCheck },
        { to: '/admin/departments', label: 'Бүтэц', icon: Building2 },
        { to: '/admin/programs', label: 'Хөтөлбөр', icon: School },
        { to: '/admin/audit-logs', label: 'Үйлдлийн түүх', icon: ScrollText },
      ],
    },
    { title: 'Сургалт', items: academicItems },
    { title: 'Санхүү', items: financeItems },
  ],
  management: [
    { items: [{ to: '/management', label: 'Нэгдсэн тойм', icon: LayoutGrid, end: true }, notifications] },
    {
      title: 'Статистик',
      items: [
        { to: '/management/schools', label: 'Сургуулиуд', icon: School },
        { to: '/management/departments', label: 'Тэнхимүүд', icon: Building2 },
        { to: '/finance/reports', label: 'Санхүүгийн тайлан', icon: BarChart3 },
      ],
    },
    {
      title: 'Мэдээлэл',
      items: [
        { to: '/academic/students', label: 'Оюутан', icon: GraduationCap },
        { to: '/academic/teachers', label: 'Багш', icon: UserSquare2 },
        { to: '/academic/announcements', label: 'Зарлал', icon: Megaphone },
      ],
    },
  ],
  academic: [
    { items: [{ to: '/academic', label: 'Хяналтын самбар', icon: LayoutGrid, end: true }, notifications] },
    { title: 'Сургалт', items: academicItems },
  ],
  finance: [
    { items: [{ to: '/finance', label: 'Хяналтын самбар', icon: LayoutGrid, end: true }, notifications] },
    { title: 'Санхүү', items: financeItems },
  ],
  teacher: [
    {
      items: [
        { to: '/teacher', label: 'Нүүр', icon: LayoutGrid, end: true },
        { to: '/teacher/courses', label: 'Миний хичээлүүд', icon: BookOpen },
        { to: '/teacher/schedule', label: 'Хуваарь', icon: CalendarDays },
        notifications,
      ],
    },
  ],
  student: [
    {
      items: [
        { to: '/student', label: 'Нүүр', icon: LayoutGrid, end: true },
        { to: '/student/schedule', label: 'Хуваарь', icon: CalendarDays },
        { to: '/student/courses', label: 'Хичээл', icon: BookOpen },
        { to: '/student/attendance', label: 'Ирц', icon: ClipboardCheck },
        { to: '/student/grades', label: 'Дүн', icon: FileText },
        { to: '/student/finance', label: 'Төлбөр', icon: Wallet },
        notifications,
        { to: '/student/profile', label: 'Миний мэдээлэл', icon: User },
      ],
    },
  ],
};
