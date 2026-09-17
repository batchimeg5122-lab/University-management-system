# Их Засаг — Сургалт, санхүүгийн нэгдсэн систем (Web)

`apps/web` — React 18 + TypeScript + Vite + Tailwind CSS + React Query.

Backend (Express API) болон Supabase-гүйгээр **туршилтын горимд** шууд ажиллана: v3 schema-гийн 16 table-ийг дуурайсан ~300 оюутан, 23 хичээл, ирц, дүн, нэхэмжлэл, төлөлттэй санах ойн өгөгдөл үүснэ.

## Эхлүүлэх

```bash
cd apps/web
npm install
npm run dev             # .env байхгүй бол mock горим, http://localhost:5173
```

Нэвтрэх хуудсан дээрх **Туршилтын эрхээр нэвтрэх** хэсгээс роль сонгоно.

| Эрх | Хэрэглэгч | Нүүр хуудас |
|---|---|---|
| Оюутан | Б.Бат-Эрдэнэ (SE-3A) | `/student` |
| Багш | Б.Бат | `/teacher` |
| Сургалтын алба | Д.Сарангэрэл | `/academic` |
| Санхүүгийн алба | П.Энхтуяа | `/finance` |
| Удирдлага | Ц.Оюунчимэг | `/management` |
| Системийн админ | Г.Мөнх-Эрдэнэ | `/admin` (бүх хэсэгт нэвтэрнэ) |

Өгөгдөл санах ойд байгаа тул хуудсыг дахин ачаалахад анхны төлөвтөө орно.

## Командууд

```bash
npm run dev        # хөгжүүлэлтийн сервер
npm run typecheck  # TypeScript шалгалт
npm run build      # production build → dist/
npm run preview    # build-ийг локалд харах
```

## Туршиж үзэх урсгал

1. **Багш** → Миний хичээлүүд → *Веб програмчлал* → **Дүн** таб → бүх оноог бөглөөд **Илгээх**
2. **Сургалтын алба** → Дүн баталгаажуулалт → тухайн хичээлийг **Баталгаажуулах** (эсвэл шалтгаантай буцаах)
3. **Оюутан** → Дүн хуудсанд шинэ дүн, Мэдэгдэлд "Шинэ дүн баталгаажлаа" харагдана
4. **Санхүү** → Нэхэмжлэл → **Төлөлт** → нэхэмжлэлийн төлөв автоматаар шинэчлэгдэнэ
5. **Сургалтын алба** → Хуваарь → давхцах өрөө/цаг оруулахад систем татгалзана

## Бүтэц

```
src/
├── app/            router.tsx (роль тус бүрийн route, lazy loading), providers.tsx
├── components/
│   ├── ui/         Button, Field, DataTable, Modal, Panel, StatStrip, Toast …
│   ├── charts/     SemesterTimeline, BarList, GradeDistributionChart, SegmentBar
│   ├── layout/     AppLayout, Sidebar, Header, navigation.ts
│   └── guards/     ProtectedRoute, RoleGuard
├── contexts/       AuthContext (Supabase Auth + туршилтын горим)
├── features/<модуль>/
│   ├── api.ts      Express endpoint дуудлага
│   ├── hooks.ts    React Query hook
│   └── components/ модульд хамаарах компонент
├── hooks/          useAuth, useRole (эрхийн хүснэгт), useRealtimeNotifications …
├── lib/
│   ├── api.ts      axios client (`{ data }` задлах, алдааны мессеж)
│   ├── mock/       db.ts (өгөгдөл), handlers.ts (API дуурайлга), adapter.ts
│   └── utils.ts, constants.ts, gpa.ts
├── pages/          auth, admin, management, academic, finance, teacher, student
└── types/          models.ts (v3 schema), reports.ts
```

## Өгөгдлийн эх үүсвэр

`.env` дотор `VITE_DATA_SOURCE`-оор сонгоно:

- `mock` — туршилтын өгөгдөл (анхдагч, `.env` байхгүй үед)
- `api` — `apps/api` Express сервер → Supabase (санал болгох)
- `supabase` — Supabase руу шууд, RLS-ээр хамгаалагдана

```env
VITE_DATA_SOURCE=api
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Гурван горим ижил endpoint гэрээг ашигладаг: `src/lib/mock/handlers.ts` (mock), `src/lib/supabase-adapter.ts` (supabase), `apps/api/src/modules` (api). Хуудсууд горим солиход өөрчлөгдөхгүй.

`.env` өөрчилсний дараа dev server-ийг дахин асаана.

> `SUPABASE_SERVICE_ROLE_KEY`-ийг frontend-ийн `.env`-д хэзээ ч бүү хий — зөвхөн `apps/api`-д.

## Дизайны зарчим

- Нэг фонт (Onest — Монгол кирилл үсгийг цэвэр харуулдаг), нэг accent өнгө (`#1E4B8F`)
- Карт бүрд сүүдэр биш — нимгэн хүрээ, хоосон зайгаар бүтэц үүсгэнэ
- Алтлаг (`#B8862B`) өнгийг зөвхөн "одоо" гэсэн утгатай элементэд: улирлын шугам дээрх одоогийн долоо хоног, явагдаж буй хичээл
- Утасны дэлгэц, keyboard focus, `prefers-reduced-motion` дэмжинэ
- Өнгө, радиус, сүүдрийн токенууд `tailwind.config.ts` дотор
