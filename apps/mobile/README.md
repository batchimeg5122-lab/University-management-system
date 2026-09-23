# Их Засаг — Mobile App

Оюутан, багшид зориулсан React Native (Expo SDK 57) + TypeScript апп.
Web системтэй **нэг** Supabase Auth, **нэг** Express API (`apps/api`), **нэг** PostgreSQL ашиглана.

```
React Native (энэ апп) ──► Supabase Auth ──► access token
        │                                        │
        └──── Authorization: Bearer <token> ─────► Express API (apps/api) ──► Supabase (service_role)
        └──── Supabase Realtime (notifications, RLS-ээр хамгаалагдсан)
```

---

## 1. Шаардлага (Windows)

| Хэрэгсэл | Шалгах | Тайлбар |
|---|---|---|
| Node.js 20+ (LTS) | `node -v` | https://nodejs.org |
| Утсан дээр **Expo Go** | — | Play Store / App Store (SDK 57-тай хувилбар) |
| Компьютер, утас **нэг Wi-Fi**-д | — | Эсвэл `--tunnel` горим |

## 2. Database migration (нэг удаа)

Supabase Dashboard → **SQL Editor** → дараах файлын агуулгыг хуулж **Run**:

```
supabase/migrations/20260922000000_mobile_push_avatars.sql
```

Энэ нь `push_tokens` хүснэгт, `student-images`, `teacher-images` bucket-уудыг үүсгэнэ.

## 3. Суулгах

```bat
cd ikhzasag-web\apps\mobile
npm install
copy .env.example .env
notepad .env
```

`.env`-д бөглөх:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_WEB_URL=http://192.168.1.10:5173
```

> **192.168.1.10**-ийн оронд өөрийн компьютерийн IP-г бичнэ:
> ```bat
> ipconfig | findstr IPv4
> ```
> Утсан дээр `localhost` нь утас өөрийгөө заадаг тул **ажиллахгүй**.
> `EXPO_PUBLIC_API_URL`-г хоосон орхивол Expo dev серверийн IP-г автоматаар ашиглана.

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`-г mobile-д **хэзээ ч** бүү оруул. Зөвхөн `apps/api/.env`.

## 4. Ажиллуулах

**Терминал 1 — API:**

```bat
cd ikhzasag-web
npm run dev:api
```

API-г утаснаас хандах боломжтой эсэхийг утасныхаа браузераар шалгана:
`http://192.168.1.10:4000/health` → `{"status":"ok"}`

Нээгдэхгүй бол Windows Firewall-д 4000 портыг нээнэ (**Admin** PowerShell):

```powershell
New-NetFirewallRule -DisplayName "IkhZasag API 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
```

**Терминал 2 — Mobile:**

```bat
cd ikhzasag-web\apps\mobile
npx expo start -c
```

Гарч ирсэн QR кодыг Android дээр **Expo Go**-оор, iPhone дээр **Camera**-аар уншуулна.

Нэг Wi-Fi-д холбогдох боломжгүй бол:

```bat
npx expo start --tunnel
```

Энэ тохиолдолд `EXPO_PUBLIC_API_URL`-д API-ийн нийтэд нээлттэй хаяг хэрэгтэй (жишээ нь deploy хийсэн эсвэл ngrok).

## 5. Нэвтрэх

- **И-мэйл** эсвэл **оюутны код / ажилтны код** (жишээ: `ST26SE001`) + нууц үг
- Зөвхөн `student`, `teacher` role нэвтэрнэ. Бусад role-д "Web системийг ашиглана уу" гэж гарна
- Админ нууц үг шинэчилсэн (`must_change_password`) бол эхлээд нууц үг солих дэлгэц гарна

---

## 6. Push notification

| Орчин | Push |
|---|---|
| iOS + Expo Go | Ажиллана (EAS projectId шаардлагатай) |
| Android + Expo Go | **Ажиллахгүй** (Expo SDK 53-аас хойш). Development build хэрэгтэй |
| Development / Preview build | Ажиллана |

```bat
npm install -g eas-cli
eas login
eas init
eas build -p android --profile development
```

`eas init` нь `app.json → extra.eas.projectId`-г автоматаар бичнэ.
Build дууссаны дараа APK-г утсандаа суулгаад:

```bat
npx expo start --dev-client
```

Push бүртгэл амжилтгүй болсон ч апп-ын бусад хэсэг хэвийн ажиллана. Мэдэгдлийг Realtime + pull-to-refresh-ээр авна.

Backend push илгээдэг үйл явдлууд:

- Дүн баталгаажсан / буцаагдсан
- Хуваарь өөрчлөгдсөн (өрөө, цаг)
- Шинэ материал нийтлэгдсэн
- Төлбөр бүртгэгдсэн
- Шинэ хичээл оноогдсон
- Зарлал нийтлэгдсэн (role-оор)

## 7. Суулгах APK (туршилтад тараах)

```bat
eas build -p android --profile preview
```

Production-д API заавал **HTTPS** байна (`EXPO_PUBLIC_API_URL=https://api.ikhzasag.edu.mn/api`).

---

## 8. Бүтэц

```
mobile/
├── App.tsx                     Provider-ууд (SafeArea, React Query + offline persist, Toast, Navigation)
├── app.json · eas.json · .env.example
├── assets/                     Сургуулийн лого, icon, splash
└── src/
    ├── api/                    client.ts (axios + token + 401 refresh), *.api.ts
    ├── components/             Button, Input, Card, Badge, Avatar, ListItem, BottomSheet, Select,
    │                           Segmented/ChipFilter, SearchBar, Skeleton, Toast, StatTile, QueryView...
    ├── constants/env.ts        EXPO_PUBLIC_* тохиргоо
    ├── hooks/                  queries.ts (React Query), useRealtime, usePushNotifications, useOnline, useRefresh
    ├── navigation/             RootNavigator, StudentNavigator, TeacherNavigator, MainTabs, types
    ├── screens/
    │   ├── auth/               Login, ForgotPassword, ChangePassword
    │   ├── common/             Schedule, Notifications/Announcements, Profile, VerifyCertificate, MaterialItem
    │   ├── student/            Home, Courses, CourseDetail, Attendance(+Detail), Grades, GPA,
    │   │                       Finance, PaymentHistory, Materials, Certificates(+Detail)
    │   └── teacher/            Home, Courses, CourseDetail, StudentList, AttendanceEntry,
    │                           GradeEntry, Materials, Statistics
    ├── services/               supabase.ts, secureStorage.ts, queryClient.ts, notification.ts, files.ts, storage.ts
    ├── store/auth.store.ts     Zustand: session, role, login/logout
    ├── theme/                  Light/Dark өнгө (web-тэй ижил палитр)
    ├── types/models.ts         Web-тэй ижил төрлүүд
    └── utils/                  format.ts, gpa.ts, constants.ts
```

## 9. Шаардлагын хэрэгжилт

| Шаардлага | Хэрэгжилт |
|---|---|
| §4–5 Нэвтрэх | И-мэйл/код + нууц үг, нууц үг харах/нуух, "Нууц үг мартсан", монгол алдааны мессеж |
| §7, §27 Navigation | Bottom tab (Home · Schedule/Courses · Notifications · Profile), бусад нь Home цэснээс |
| §14 Дүн | Зөвхөн баталгаажсан эцсийн дүн. Баталгаажаагүй бол зөвхөн явцын оноо |
| §21–22 Тодорхойлолт | Дугаар, verify code, QR код (web `/verify/<code>` руу заана), хуваалцах. Нэвтрэлгүй шалгах |
| §30 Ирц бүртгэх | Огноо сонгох (ирээдүй хаалттай), "Бүгд ирсэн", 5 төлөв, хадгалаагүй бол анхааруулна |
| §31–32 Дүн | Draft хадгалах → Submit (баталгаажуулалттай). 0–max validation, нийт/үсгэн үнэлгээ шууд тооцно |
| §33 Материал | Файл сонгох → signed URL-аар шууд Storage руу (50MB), нийтлэх/буцаах, засах, устгах, хандалтын тоо |
| §42 Realtime | `notifications` INSERT → мэдэгдэл, дүн, хуваарь, төлбөрийг шинэчилнэ |
| §43 Offline | Профайл, хичээл, хуваарь, мэдэгдлийг утсанд cache (7 хоног). Санхүү/дүн хадгалахгүй. Бичих үйлдэл онлайн үед л |
| §44–46 | Offline banner, ойлгомжтой алдаа (stack trace-гүй), Skeleton, pull-to-refresh, Empty state |
| §49–50 Хайлт, шүүлт | Оюутан/материал/мэдэгдэл хайх, улирал/хичээл/төлөв/өдрөөр шүүх |
| §51 Аюулгүй байдал | Token → SecureStore (Keychain/Keystore, chunk-лэн), 401 → refresh → Login, service key байхгүй |
| §53 Logout | Push token устгах, Supabase session, local cache, профайл cache цэвэрлэнэ |
| §55 Pagination | Мэдэгдэл, төлбөрийн түүх — infinite scroll |
| §58 Audit | Request бүр `X-Client-Platform: mobile` → audit_logs-д `source: MOBILE` |

## 10. Түгээмэл алдаа

| Алдаа | Шийдэл |
|---|---|
| "Интернет холболт байхгүй байна" (нэвтрэхэд) | `EXPO_PUBLIC_API_URL` IP буруу, API асаагүй, эсвэл Firewall. Утасны браузераар `/health`-г шалга |
| `.env` өөрчилсөн ч нөлөөлөхгүй | `npx expo start -c` (cache цэвэрлэх) |
| "Апп-ын тохиргоо дутуу байна" | `.env`-д Supabase URL, ANON key бөглөөгүй |
| Expo Go "Project is incompatible" | Expo Go-г шинэчил (SDK 57) |
| Профайл зураг байршихгүй | Migration (§2) ажиллуулаагүй — bucket байхгүй |
| Push ирэхгүй | Android Expo Go дэмжихгүй → development build; `eas init` хийсэн эсэх |

## 11. Командууд

```bat
npm start              REM Expo dev server
npm run start:clear    REM cache цэвэрлэж асаах
npm run start:tunnel   REM өөр сүлжээнээс
npm run typecheck      REM TypeScript шалгах
npm run build:apk      REM EAS preview APK
```

---

## 12. Нэмэлт боломжууд (v1.1)

| Боломж | Хаана | Тайлбар |
|---|---|---|
| Face ID / хурууны хээ | Профайл → Аюулгүй байдал | Апп нээх бүрт, 30 сек-ээс удаан background-д байсны дараа түгжинэ. Logout хийхэд автоматаар унтарна |
| Хичээлийн сануулга | Профайл → Хичээлийн сануулга | 5 / 10 / 15 / 30 минутын өмнө. Локал мэдэгдэл — backend, интернет хэрэггүй, **Android Expo Go дээр ч ажиллана** |
| Мэдэгдлээс шууд очих | Push / сануулга / апп доторх мэдэгдэл | Дүн → Дүн, хуваарь → Хуваарь, төлбөр → Санхүү, багшид буцаагдсан дүн → тухайн хичээлийн Дүн оруулах |
| Тодорхойлолт PDF | Тодорхойлолт → PDF татах / илгээх | Web-тэй ижил A4 загвар, лого, QR код. iPhone: Save to Files |
| Тоолуур | Нүүр дэлгэц | Хуваарьт "Шалгалт" төрлийн цаг байвал дараагийн шалгалт + улирал дуусах хүртэлх хоног |
| Танилцуулга | Апп анх нээхэд | 3 слайд, "Алгасах" боломжтой |

> Шалгалтын тоолуур нь хуваарийн `session_type = 'exam'` мөрүүдээс бодогдоно
> (Сургалтын алба Web дээр хуваарь үүсгэхдээ төрлийг "Шалгалт" гэж сонгоно).

## 13. Цахим оюутны үнэмлэх (v1.2)

Нүүр → **Үнэмлэх** эсвэл Профайл → **Цахим оюутны үнэмлэх**. Картыг дарахад эргэж QR код гарна.

- QR нь `<EXPO_PUBLIC_WEB_URL>/id/<token>` хаяг руу заана → шалгагч **энгийн утасны камераар** уншуулахад Web-ийн шалгах хуудас нээгдэнэ (апп суулгах шаардлагагүй)
- Token 10 минут хүчинтэй, апп 2 минут тутамд шинэчилнэ → screenshot дамжуулах боломжгүй
- Урд талд секунд бүр шинэчлэгдэх цаг, анивчих ногоон цэг — "амьд" дэлгэц гэдгийг шалгагч харна
- Хүчинтэй хугацаа = одоогийн улирлын `end_date`. Оюутны төлөв `active` биш бол хүчингүй
- Offline үед карт харагдана, QR хугацаа дуусвал "Интернетэд холбогдоно уу" гэж гарна

**Утсаар турших (хөгжүүлэлтийн үед):** шалгагчийн утас Web хуудас руу хандах ёстой тул:

```powershell
# apps/web/.env
VITE_API_URL=http://172.20.10.9:4000/api
# apps/api/.env  (таслалаар нэмнэ)
CORS_ORIGIN=http://localhost:5173,http://172.20.10.9:5173
# Web-ийг LAN-д нээх
cd C:\Projects\ikhzasag-web\apps\web
npx vite --host
```

## 14. Шалгалтын хуваарь (v1.4)

- Сургалтын алба Web → **Шалгалтын хуваарь** дээр товлоход оюутан, багшид push ирнэ
- Mobile: Нүүрний тоолуур дээр дарах, эсвэл багшийн нүүр → **Шалгалт**
- "Хичээлийн сануулга" асаалттай бол шалгалтын **өмнөх орой 20:00** болон **1 цагийн өмнө** сануулна
- Мэдэгдэл илгээх төвөөс ирсэн мэдэгдэл **Зарлал** таб дээр харагдана
