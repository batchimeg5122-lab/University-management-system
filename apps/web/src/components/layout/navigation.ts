import type { LucideIcon } from 'lucide-react';
import {
  BarChart3, Bell, BookOpen, Building2, CalendarDays, CalendarRange, ClipboardCheck, CreditCard, FileText,
  DoorOpen, FileCheck2, FolderOpen, GraduationCap, LayoutGrid, Megaphone, PieChart, Receipt, ScrollText, School, ShieldCheck, User, UserSquare2, Users, Wallet,
  CalendarCheck, ScanLine, Send, Smartphone, HandCoins, Landmark, BadgePercent,
  AlertTriangle, CalendarHeart, KanbanSquare, Mail, TrendingUp, History, Settings, ShieldEllipsis,
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
  { to: '/academic/schedule-board', label: 'Хуваарийн самбар', icon: KanbanSquare },
  { to: '/academic/rooms', label: 'Өрөө, танхим', icon: DoorOpen },
  { to: '/academic/semesters', label: 'Улирал', icon: CalendarRange },
  { to: '/academic/grades', label: 'Дүн баталгаажуулалт', icon: ClipboardCheck },
  { to: '/academic/exams', label: 'Шалгалтын хуваарь', icon: CalendarCheck },
  { to: '/academic/announcements', label: 'Зарлал', icon: Megaphone },
  { to: '/academic/broadcasts', label: 'Мэдэгдэл илгээх', icon: Send },
  { to: '/academic/at-risk', label: 'Сурлагын эрсдэл', icon: AlertTriangle },
  { to: '/academic/trends', label: 'Хандлага', icon: TrendingUp },
];

const financeItems: NavItem[] = [
  { to: '/finance/invoices', label: 'Нэхэмжлэл', icon: Receipt },
  { to: '/finance/payments', label: 'Төлөлт', icon: CreditCard },
  { to: '/finance/debtors', label: 'Өр төлбөр', icon: HandCoins },
  { to: '/finance/reconcile', label: 'Банкны хуулга', icon: Landmark },
  { to: '/finance/discount-rules', label: 'Хөнгөлөлтийн дүрэм', icon: BadgePercent },
  { to: '/finance/reports', label: 'Санхүүгийн тайлан', icon: PieChart },
];

const notifications: NavItem = { to: '/notifications', label: 'Мэдэгдэл', icon: Bell };
const cardCheck: NavItem = { to: '/card-check', label: 'Үнэмлэх шалгах', icon: ScanLine };
const calendar: NavItem = { to: '/calendar', label: 'Академик календарь', icon: CalendarHeart };
const security: NavItem = { to: '/security', label: 'Аюулгүй байдал', icon: ShieldEllipsis };

export const NAVIGATION: Record<UserRole, NavGroup[]> = {
  super_admin: [
    { items: [{ to: '/admin', label: 'Хяналтын самбар', icon: LayoutGrid, end: true }, notifications, calendar, security] },
    {
      title: 'Систем',
      items: [
        { to: '/admin/users', label: 'Хэрэглэгч, эрх', icon: ShieldCheck },
        { to: '/admin/departments', label: 'Бүтэц', icon: Building2 },
        { to: '/admin/programs', label: 'Хөтөлбөр', icon: School },
        { to: '/admin/audit-logs', label: 'Үйлдлийн түүх', icon: ScrollText },
        { to: '/admin/mobile', label: 'Mobile статистик', icon: Smartphone },
        { to: '/admin/login-history', label: 'Нэвтрэлтийн түүх', icon: History },
        { to: '/admin/settings', label: 'Системийн тохиргоо', icon: Settings },
        cardCheck,
      ],
    },
    { title: 'Сургалт', items: academicItems },
    { title: 'Санхүү', items: financeItems },
  ],
  management: [
    { items: [{ to: '/management', label: 'Нэгдсэн тойм', icon: LayoutGrid, end: true }, notifications, calendar, security] },
    {
      title: 'Статистик',
      items: [
        { to: '/management/schools', label: 'Сургуулиуд', icon: School },
        { to: '/management/departments', label: 'Тэнхимүүд', icon: Building2 },
        { to: '/finance/reports', label: 'Санхүүгийн тайлан', icon: BarChart3 },
        { to: '/finance/debtors', label: 'Өр төлбөр', icon: HandCoins },
        { to: '/academic/trends', label: 'Хандлага', icon: TrendingUp },
        { to: '/academic/at-risk', label: 'Сурлагын эрсдэл', icon: AlertTriangle },
        { to: '/management/weekly', label: 'Долоо хоногийн тайлан', icon: Mail },
      ],
    },
    {
      title: 'Мэдээлэл',
      items: [
        { to: '/academic/students', label: 'Оюутан', icon: GraduationCap },
        { to: '/academic/teachers', label: 'Багш', icon: UserSquare2 },
        { to: '/academic/exams', label: 'Шалгалтын хуваарь', icon: CalendarCheck },
        { to: '/academic/announcements', label: 'Зарлал', icon: Megaphone },
        { to: '/academic/broadcasts', label: 'Мэдэгдэл илгээх', icon: Send },
        cardCheck,
      ],
    },
  ],
  academic: [
    { items: [{ to: '/academic', label: 'Хяналтын самбар', icon: LayoutGrid, end: true }, notifications, calendar, cardCheck, security] },
    { title: 'Сургалт', items: academicItems },
  ],
  finance: [
    { items: [{ to: '/finance', label: 'Хяналтын самбар', icon: LayoutGrid, end: true }, notifications, calendar, cardCheck, security] },
    { title: 'Санхүү', items: financeItems },
  ],
  teacher: [
    {
      items: [
        { to: '/teacher', label: 'Нүүр', icon: LayoutGrid, end: true },
        { to: '/teacher/courses', label: 'Миний хичээлүүд', icon: BookOpen },
        { to: '/teacher/schedule', label: 'Хуваарь', icon: CalendarDays },
        notifications,
        calendar,
        cardCheck,
        security,
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
        { to: '/student/materials', label: 'Материал', icon: FolderOpen },
        { to: '/student/finance', label: 'Төлбөр', icon: Wallet },
        { to: '/student/certificates', label: 'Тодорхойлолт', icon: FileCheck2 },
        notifications,
        calendar,
        security,
        { to: '/student/profile', label: 'Миний мэдээлэл', icon: User },
      ],
    },
  ],
};
