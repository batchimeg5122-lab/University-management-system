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
│   ├── audit.middleware.ts          audit_logs бичих
│   └── error.middleware.ts          HttpError → { error: { message } }
├── modules/<модуль>/  routes · controller · service · schema
├── utils/           gpa.ts, api-response.ts, async-handler.ts, pagination.ts, constants.ts
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

## Командууд

```bash
npm run dev        # tsx watch
npm run typecheck
npm run build      # dist/
npm start          # production
```
