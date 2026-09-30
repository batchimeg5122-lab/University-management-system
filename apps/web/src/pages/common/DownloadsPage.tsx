import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, CalendarCheck, CalendarDays, ClipboardCheck, Clock,
  CreditCard, FileText, GraduationCap, HandCoins, History, Landmark, Receipt, ScrollText, UserSquare2, Users,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRole } from '@/hooks/useRole';
import type { UserRole } from '@/types/models';

type Format = 'Excel' | 'PDF';

interface DownloadItem {
  label: string;
  /** Юу татахыг тайлбарлана */
  description: string;
  to: string;
  icon: LucideIcon;
  formats: Format[];
  roles: UserRole[];
}

interface DownloadGroup {
  title: string;
  items: DownloadItem[];
}

const ALL: DownloadGroup[] = [
  {
    title: 'Хичээлийн цаг, ачаалал',
    items: [
      {
        label: 'Миний хичээлийн цаг',
        description: 'Улирлын ачаалал — хичээл, анги, долоо хоногийн болон улирлын академик цаг. Гарын үсгийн хүрээтэй тодорхойлолт.',
        to: '/teacher/workload',
        icon: Clock,
        formats: ['Excel', 'PDF'],
        roles: ['teacher'],
      },
      {
        label: 'Багш нарын ачаалал',
        description: 'Багш тус бүрийн долоо хоногийн цаг, хичээл, анги, оюутны тоо. Сонгосон багшийн тодорхойлолтыг PDF-ээр.',
        to: '/academic/teacher-workload',
        icon: UserSquare2,
        formats: ['Excel', 'PDF'],
        roles: ['super_admin', 'academic', 'management'],
      },
      {
        label: 'Хуваарь',
        description: 'Долоо хоногийн хуваарь, цуцлагдсан хичээлүүдийн хяналт.',
        to: '/academic/schedules',
        icon: CalendarDays,
        formats: ['Excel'],
        roles: ['super_admin', 'academic'],
      },
      {
        label: 'Шалгалтын хуваарь',
        description: 'Товлогдсон шалгалтууд — өдөр, цаг, өрөө, анги.',
        to: '/academic/exams',
        icon: CalendarCheck,
        formats: ['Excel'],
        roles: ['super_admin', 'academic', 'management'],
      },
    ],
  },
  {
    title: 'Дүн, ирц',
    items: [
      {
        label: 'Дүнгийн хуудас (хичээлээр)',
        description: 'Хичээл сонгоод бүрэлдэхүүн оноо, нийт, үнэлгээ, төлөвтэй хамт татна.',
        to: '/teacher/courses',
        icon: FileText,
        formats: ['Excel'],
        roles: ['teacher'],
      },
      {
        label: 'Ирцийн журнал',
        description: 'Оюутан × огнооны матриц, ирсэн/хоцорсон/тасалсан тоо, ирцийн хувь.',
        to: '/teacher/courses',
        icon: ClipboardCheck,
        formats: ['Excel'],
        roles: ['teacher'],
      },
      {
        label: 'Дүн баталгаажуулалт',
        description: 'Багш нараас илгээсэн дүнгүүд, хянах шаардлагатай хичээлүүд.',
        to: '/academic/grades',
        icon: ClipboardCheck,
        formats: ['Excel'],
        roles: ['super_admin', 'academic'],
      },
      {
        label: 'Оюутны дүнгийн хуудас (transcript)',
        description: 'Баталгаажсан дүнгээр улирал тус бүрийн кредит, GPA-тай албан хуудас.',
        to: '/academic/students',
        icon: GraduationCap,
        formats: ['PDF'],
        roles: ['super_admin', 'academic', 'management'],
      },
      {
        label: 'Миний дүн',
        description: 'Улирал тус бүрийн дүн, кредит, GPA — дүнгийн хуудсаар.',
        to: '/student/grades',
        icon: FileText,
        formats: ['PDF'],
        roles: ['student'],
      },
      {
        label: 'Сурлагын эрсдэл',
        description: 'Ирц, явц, GPA, өрөөр 0–100 оноо, шалтгаантай жагсаалт.',
        to: '/academic/at-risk',
        icon: AlertTriangle,
        formats: ['Excel'],
        roles: ['super_admin', 'academic', 'management'],
      },
    ],
  },
  {
    title: 'Төлбөр, санхүү',
    items: [
      {
        label: 'Төлбөр төлсөн баримт',
        description: 'Төлөлт бүрийн албан баримт — дугаар, дүн тоо ба үгээр, гарын үсэг, тамганы хүрээтэй.',
        to: '/finance/payments',
        icon: Receipt,
        formats: ['PDF'],
        roles: ['super_admin', 'finance', 'academic', 'management'],
      },
      {
        label: 'Миний төлбөрийн баримт',
        description: 'Төлсөн төлбөр бүрийн баримтыг PDF-ээр татаж, төлөлтийн түүхээ Excel-ээр авна.',
        to: '/student/finance',
        icon: Receipt,
        formats: ['PDF', 'Excel'],
        roles: ['student'],
      },
      {
        label: 'Төлөлтийн жагсаалт',
        description: 'Бүх төлөлт — огноо, оюутан, нэхэмжлэл, дүн, хэлбэр, баримтын дугаар.',
        to: '/finance/payments',
        icon: CreditCard,
        formats: ['Excel'],
        roles: ['super_admin', 'finance'],
      },
      {
        label: 'Нэхэмжлэл',
        description: 'Нэхэмжлэлүүд — төлбөл зохих, төлсөн, үлдэгдэл, төлөв.',
        to: '/finance/invoices',
        icon: Receipt,
        formats: ['Excel'],
        roles: ['super_admin', 'finance'],
      },
      {
        label: 'Өр төлбөр (дебитор)',
        description: 'Үлдэгдэлтэй оюутнууд, хугацаа хэтрэлт, холбоо барих мэдээлэл.',
        to: '/finance/debtors',
        icon: HandCoins,
        formats: ['Excel'],
        roles: ['super_admin', 'finance', 'management'],
      },
      {
        label: 'Санхүүгийн тайлан',
        description: 'Улирлын төлбөр цуглуулалт, хөнгөлөлт, төлөлтийн хэлбэрээр хуваарилалт.',
        to: '/finance/reports',
        icon: BarChart3,
        formats: ['Excel'],
        roles: ['super_admin', 'finance', 'management'],
      },
      {
        label: 'Банкны хуулга тулгалт',
        description: 'Хуулгын мөр бүрийн тулгалтын дүн — тохирсон, давхардсан, тохироогүй.',
        to: '/finance/reconcile',
        icon: Landmark,
        formats: ['Excel'],
        roles: ['super_admin', 'finance'],
      },
    ],
  },
  {
    title: 'Бүртгэл, статистик',
    items: [
      {
        label: 'Оюутны бүртгэл',
        description: 'Оюутнууд — код, хөтөлбөр, анги, төлөв, GPA, кредит.',
        to: '/academic/students',
        icon: GraduationCap,
        formats: ['Excel'],
        roles: ['super_admin', 'academic', 'management'],
      },
      {
        label: 'Багшийн бүртгэл',
        description: 'Багш, ажилтнууд — тэнхим, албан тушаал, холбоо барих.',
        to: '/academic/teachers',
        icon: Users,
        formats: ['Excel'],
        roles: ['super_admin', 'academic', 'management'],
      },
      {
        label: 'Хичээлийн сан, хуваарилалт',
        description: 'Хичээлүүд, кредит, оноогдсон багш, анги, оюутны тоо.',
        to: '/academic/courses',
        icon: BookOpen,
        formats: ['Excel'],
        roles: ['super_admin', 'academic'],
      },
      {
        label: 'Тэнхим, сургуулийн статистик',
        description: 'Оюутны тоо, GPA, ирц, төлбөр цуглуулалтын нэгдсэн үзүүлэлт.',
        to: '/management/departments',
        icon: BarChart3,
        formats: ['Excel'],
        roles: ['super_admin', 'management'],
      },
      {
        label: 'Үйлдлийн түүх',
        description: 'Хэн, хэзээ, ямар үйлдэл хийсэн — web/mobile эх сурвалжтай.',
        to: '/admin/audit-logs',
        icon: ScrollText,
        formats: ['Excel'],
        roles: ['super_admin'],
      },
      {
        label: 'Нэвтрэлтийн түүх',
        description: 'Нэвтрэлт — IP, төхөөрөмж, 2FA эсэх.',
        to: '/admin/login-history',
        icon: History,
        formats: ['Excel'],
        roles: ['super_admin'],
      },
    ],
  },
];

/**
 * «Мэдээлэл татах» — нэвтэрсэн эрхэд боломжтой бүх татах мэдээллийн нэгдсэн хуудас.
 * Тухайн жагсаалт/тайлан бүр өөрийн хуудсандаа Excel эсвэл PDF товчтой.
 */
export default function DownloadsPage() {
  useDocumentTitle('Мэдээлэл татах');
  const { role } = useRole();

  const groups = ALL.map((g) => ({ ...g, items: g.items.filter((i) => !!role && i.roles.includes(role)) })).filter((g) => g.items.length);
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <>
      <PageHeader
        title="Мэдээлэл татах"
        description={`Танд боломжтой ${total} төрлийн тайлан, баримт. Хүссэнээ дарж тухайн хуудсанд Excel эсвэл PDF болгон татна.`}
      />

      {!groups.length ? (
        <Panel>
          <EmptyState icon={FileText} title="Татах мэдээлэл алга" description="Танд оноогдсон эрхэд татах тайлан бүртгэгдээгүй байна." />
        </Panel>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <Panel key={g.title} title={g.title} bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {g.items.map((i) => (
                  <li key={`${g.title}-${i.label}`}>
                    <Link to={i.to} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-paper/70">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent">
                        <i.icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-medium text-ink">{i.label}</span>
                          {i.formats.map((f) => (
                            <span
                              key={f}
                              className={`rounded-[4px] px-1.5 py-px text-[10.5px] font-medium ${f === 'Excel' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}
                            >
                              {f}
                            </span>
                          ))}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{i.description}</span>
                      </span>
                      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      <p className="mt-6 text-[12.5px] leading-relaxed text-faint">
        Excel файл нь толгой мөр тодруулсан, шүүлтүүртэй байдлаар гарна. PDF баримтууд нь сургуулийн лого, дугаар, гарын үсгийн хүрээтэй — албан
        хэрэгцээнд шууд хэвлэж болно.
      </p>
    </>
  );
}
