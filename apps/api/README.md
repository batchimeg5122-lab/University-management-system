# Их Засаг — API (apps/api)

Node.js + Express + TypeScript + Supabase (service_role).
Frontend (`apps/web`)-ийн бүх endpoint-ыг `{ data }` хэлбэрээр хариулна.

## Эхлүүлэх

```bash
cd apps/api
npm install
cp .env.example .env     # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY бөглөнө
npm run dev              # http://localhost:4000/api
```

Шалгах: `http://localhost:4000/health` → `{"status":"ok"}`

Web талд (`apps/web/.env`):

```env
VITE_DATA_SOURCE=api
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Анхны админ үүсгэх

API-гаар хэрэглэгч үүсгэхэд super_admin эрх хэрэгтэй тул эхний админыг гараар үүсгэнэ:

1. Supabase Dashboard → Authentication → **Add user** (и-мэйл, нууц үг, *Auto confirm*)
2. SQL Editor дээр:

```sql
insert into public.users (id, email, last_name, first_name, role, status)
select id, email, 'Админ', 'Систем', 'super_admin', 'active'
from auth.users where email = 'admin@ikhzasag.edu.mn';
```

Үүний дараа веб дээр нэвтэрч бусад хэрэглэгч, оюутан, багшийг UI-аас бүртгэнэ.

## Бүтэц

```
src/
├── config/          env.ts (zod шалгалт), supabase.ts (service_role client)
├── middleware/
│   ├── auth.middleware.ts           Bearer token → req.user (30 сек cache)
│   ├── role.middleware.ts           requireRole(...) — super_admin бүгдэд
│   ├── course-access.middleware.ts  багш зөвхөн өөрийн хичээлд
│   ├── validate.middleware.ts       zod body/query
│   ├── audit.middleware.ts          audit_logs бичих (source: WEB/MOBILE)
│   └── error.middleware.ts          HttpError → { error: { message } }
├── modules/<модуль>/  routes · controller · service · schema
├── utils/           gpa.ts, api-response.ts, async-handler.ts, pagination.ts, constants.ts, push.ts, local-date.ts
├── types/express.d.ts
├── routes.ts        /api/* холбох
├── app.ts           helmet, cors, json, morgan
└── server.ts        Supabase холболт шалгаад асаана
```

## Аюулгүй байдал

- `service_role` key нь RLS-ийг тойрдог. Тиймээс эрхийн хяналт бүр route дээр `requireRole` / `requireCourseAccess`-ээр хийгдэнэ.
- Оюутан зөвхөн өөрийн `/me` endpoint-уудад, баталгаажсан дүнгээ л харна.
- Дүн, ирц, төлбөр, эрхийн өөрчлөлт бүр `audit_logs`-д бичигдэнэ.
- `SUPABASE_SERVICE_ROLE_KEY`-ийг хэзээ ч git-д болон frontend-д бүү оруул.

## Серверт тооцоолдог логик

- Дүн хадгалахад нийт оноо, үсгэн үнэлгээ, голч оноо (`utils/gpa.ts`)
- Дүн баталгаажихад оюутны нийт голч, кредит (`grades.service.ts → recomputeGpa`)
- Төлөлт бүртгэхэд нэхэмжлэлийн `paid_amount`, `status` (`invoices.service.ts → syncInvoice`)
- Хуваарийн өрөө, анги, багшийн цагийн давхцал (`schedules.service.ts`)

DB дээр ижил trigger байгаа бол давхар ажиллахад үр дүн өөрчлөгдөхгүй.

## Mobile App-д зориулсан endpoint-ууд

| Method | Endpoint | Эрх | Тайлбар |
|---|---|---|---|
| PATCH | `/api/auth/me` | нэвтэрсэн | Утас, профайл зураг (`avatar_path`) шинэчлэх |
| POST | `/api/auth/me/avatar-upload-url` | нэвтэрсэн | `student-images` / `teacher-images` bucket-д signed upload URL |
| POST | `/api/devices` | нэвтэрсэн | Expo push token бүртгэх |
| POST | `/api/devices/unregister` | нэвтэрсэн | Logout үед push token устгах |
| GET | `/api/teacher/dashboard` | багш | Өнөөдрийн хичээл, ирц бүртгэх, дүнгийн төлөв — нэг хүсэлтээр |
| GET | `/api/student-card/me` | оюутан | Цахим үнэмлэх + 10 минутын хүчинтэй QR token (HMAC) |
| GET | `/api/student-card/verify/:token` | **нээлттэй** | QR шалгах. Гарын үсэг буруу/хугацаа дууссан бол хувийн мэдээлэл буцаахгүй |
| POST | `/api/student-card/check` | ажилтан, багш | Шалгах самбар: шалгаад `student_card_checks`-д бичнэ |
| GET | `/api/student-card/checks` | ажилтан, багш | Сүүлийн шалгалтууд + өнөөдрийн тоо |
| GET/POST | `/api/broadcasts` | сургалт, удирдлага | Чиглүүлсэн мэдэгдэл (push, товлох, уншсан статистик) |
| POST | `/api/broadcasts/preview` | сургалт, удирдлага | Хүлээн авагчийн тоо |
| GET | `/api/exams` | нэвтэрсэн | Шалгалтын хуваарь (оюутан/багшид өөрийнх) |
| POST/PATCH/DELETE | `/api/exams` | сургалт, хичээлийн багш | Товлох/өөрчлөх → оюутан, багшид push |
| GET | `/api/devices/stats` | удирдлага | Mobile төхөөрөмжийн статистик |

| GET/POST/PUT/PATCH/DELETE | `/api/discount-rules` | санхүү (унших: удирдлага) | Хөнгөлөлтийн дүрэм |
| POST | `/api/invoices/bulk/preview`, `/api/invoices/bulk` | санхүү | Бөөнөөр нэхэмжлэх (урьдчилан тооцоо → үүсгэх) |
| GET | `/api/invoices/debtors` | санхүү, удирдлага | Үлдэгдэлтэй нэхэмжлэл |
| POST | `/api/invoices/remind` | санхүү | Сонгосон нэхэмжлэлд сануулга (push) |
| POST | `/api/payments/reconcile/preview` | санхүү | Банкны хуулгын мөрүүдийг тулгах |
| POST | `/api/payments/bulk` | санхүү | Тулгасан төлөлтийг бөөнөөр бүртгэх |

| GET/POST/PATCH/DELETE | `/api/calendar` | бүгд унших / сургалт засах | Академик календарь |
| GET | `/api/analytics/at-risk` | сургалт, удирдлага | Сурлагын эрсдэлийн оноо |
| POST | `/api/analytics/at-risk/notify` | сургалт, удирдлага | Ангийн зөвлөх багшид мэдэгдэх |
| GET | `/api/analytics/trends` | сургалт, удирдлага, санхүү | 8 улирлын хандлага (10 мин cache, `?fresh=true`) |
| GET/POST | `/api/analytics/weekly`, `/api/analytics/weekly/send` | удирдлага | Долоо хоногийн тайлан (HTML, SMTP) |

| GET/PUT | `/api/settings`, `/api/settings/:key` | super_admin | Системийн тохиргоо (grading, security, finance, general) |
| GET | `/api/settings/public` | нэвтэрсэн | Үнэлгээний шкал, байгууллагын мэдээлэл |
| POST | `/api/auth/login-event` | нэвтэрсэн | Нэвтрэлтийн түүхэнд бичих (web/mobile) |
| GET | `/api/auth/login-history` | нэвтэрсэн | Өөрийн сүүлийн нэвтрэлтүүд |
| GET | `/api/admin/login-history` | super_admin | Бүх хэрэглэгчийн нэвтрэлт |

| GET | `/api/auth/sessions` | нэвтэрсэн | Идэвхтэй нэвтрэлтүүд (web/mobile) |
| DELETE | `/api/auth/sessions/:platform` | нэвтэрсэн | Тухайн платформын нэвтрэлтийг хаах |

**Нэг платформ = нэг нэвтрэлт:** `security.single_session=true` үед Supabase JWT-ийн `session_id`-г
`active_sessions`-тай тулгана. Таарахгүй бол `401 { error: { code: 'SESSION_REPLACED' } }`
(`middleware/session.middleware.ts`). Платформыг `X-Client-Platform` header-ээр ялгана (mobile илгээдэг, бусад нь web).

**2FA бодлого:** `security.require_staff_mfa=true` үед super_admin, management, academic, finance эрхтэй
хэрэглэгчийн JWT `aal2` биш бол `403 { error: { code: 'MFA_REQUIRED' } }` (`middleware/mfa.middleware.ts`).

**Тест:** `npm test` (Vitest) — `tests/` доторх 33 тест: GPA, хөнгөлөлт, банкны хуулга, QR token, Swagger, цагийн бүс.

Товлосон мэдэгдлийн push-ийг `server.ts` минут тутамд илгээнэ (`broadcasts.service.ts → processScheduled`).
Санхүүгийн ажил цагт нэг ажиллана (`invoices.reminders.ts → runFinanceJobs`): хугацаа хэтрэлт + автомат сануулга.

Автомат push notification (`utils/push.ts`): `notifyUsers()` дуудагдах бүрт (дүн баталгаажсан,
төлбөр, шинэ хичээл...) мөн зарлал нийтлэх, **хуваарь өөрчлөгдөх**, **шинэ материал нийтлэх** үед.
Mobile хүсэлт `X-Client-Platform: mobile` header илгээдэг тул `audit_logs.new_data.source = "MOBILE"` болно.

Шаардлагатай migration: `supabase/migrations/20260922000000_mobile_push_avatars.sql`

## API баримт бичиг (Swagger)

- UI: http://localhost:4000/api/docs
- JSON: http://localhost:4000/api/openapi.json

Route-уудаас **автоматаар** үүснэ (`src/docs/openapi.ts`): зам, method, нэвтрэлт, `requireRole(...)` эрх.
**Authorize** дээр Supabase access token оруулж шууд туршина. Production-д `API_DOCS=true` үед л нээгдэнэ.

## Командууд

```bash
npm run dev        # tsx watch
npm run typecheck
npm run build      # dist/
npm start          # production
```
