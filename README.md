# Их Засаг — Сургалт, санхүүгийн нэгдсэн систем

```
ikhzasag-web/
├── apps/
│   ├── api/     Node.js + Express + TypeScript → Supabase (service_role)
│   └── web/     React + Vite + TypeScript + Tailwind
├── package.json  хоёуланг нэг дор ажиллуулах скриптүүд
└── README.md
```

## 1. Суулгах

```bash
cd ikhzasag-web
npm run setup
```

## 2. Тохиргоо

**apps/api/.env**

```bash
cp apps/api/.env.example apps/api/.env        # Windows: copy apps\api\.env.example apps\api\.env
```

```env
PORT=4000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CORS_ORIGIN=http://localhost:5173
```

**apps/web/.env**

```bash
cp apps/web/.env.example apps/web/.env        # Windows: copy apps\web\.env.example apps\web\.env
```

```env
VITE_DATA_SOURCE=api
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> `SUPABASE_SERVICE_ROLE_KEY` зөвхөн **apps/api**-д. Web-д зөвхөн ANON key.

## 3. Ажиллуулах

```bash
npm run dev          # API (4000) + Web (5173) зэрэг
npm run dev:api      # зөвхөн API
npm run dev:web      # зөвхөн Web
```

- Web: http://localhost:5173
- API шалгах: http://localhost:4000/health

## Өгөгдлийн эх үүсвэр (apps/web/.env → VITE_DATA_SOURCE)

| Утга | Тайлбар |
|---|---|
| `api` | Web → Express API → Supabase. **Санал болгох** |
| `supabase` | Web → Supabase шууд (RLS). Backend-гүй, хэрэглэгч үүсгэх боломжгүй |
| `mock` | Туршилтын өгөгдөл. Юу ч тохируулахгүйгээр UI-г үзэх |

`.env` файл байхгүй бол **mock** горимоор асна — нэвтрэх хуудсан дээрх 6 рольоос сонгож шууд үзэж болно.

## Анхны админ

1. Supabase Dashboard → Authentication → **Add user** (Auto confirm)
2. SQL Editor:

```sql
insert into public.users (id, email, last_name, first_name, role, status)
select id, email, 'Админ', 'Систем', 'super_admin', 'active'
from auth.users where email = 'admin@ikhzasag.edu.mn';
```

3. Веб дээр нэвтэрч, бусад хэрэглэгч, оюутан, багшийг UI-аас бүртгэнэ.

Дэлгэрэнгүй: `apps/api/README.md`, `apps/web/README.md`
