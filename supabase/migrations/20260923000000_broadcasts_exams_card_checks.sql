-- =====================================================================
-- ИХ ЗАСАГ — Шат 2 (Web ↔ Mobile уялдаа)
--   1) broadcasts            : Мэдэгдэл илгээх төв (чиглүүлсэн, товлосон, статистиктай)
--   2) notifications.broadcast_id
--   3) exams                 : Тодорхой огноотой шалгалтын хуваарь
--   4) student_card_checks   : Цахим үнэмлэх шалгасан түүх
-- Давтан ажиллуулахад аюулгүй (idempotent). Бүх хандалт Express API (service_role)-ээр.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. BROADCASTS
-- ---------------------------------------------------------------------
create table if not exists public.broadcasts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 3 and 200),
  message          text not null check (char_length(message) >= 3),
  type             text not null default 'announcement',
  audience         jsonb not null default '{}'::jsonb,   -- { kind, ids, role, label }
  audience_label   text,
  send_push        boolean not null default true,
  publish_at       timestamptz,                          -- null = шууд
  pushed_at        timestamptz,                          -- push илгээгдсэн хугацаа
  recipient_count  integer not null default 0,
  created_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists broadcasts_created_idx on public.broadcasts(created_at desc);
create index if not exists broadcasts_pending_push_idx on public.broadcasts(publish_at) where pushed_at is null and send_push;

alter table public.notifications add column if not exists broadcast_id uuid references public.broadcasts(id) on delete cascade;
create index if not exists notifications_broadcast_idx on public.notifications(broadcast_id);

-- ---------------------------------------------------------------------
-- 2. EXAMS
-- ---------------------------------------------------------------------
create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null default 'Шалгалт',
  exam_type   text not null default 'final' check (exam_type in ('quiz', 'midterm', 'final', 'retake', 'other')),
  exam_date   date not null,
  start_time  time not null,
  end_time    time not null,
  building    text,
  room        text,
  is_online   boolean not null default false,
  note        text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint exams_time_check check (end_time > start_time)
);

create index if not exists exams_course_idx on public.exams(course_id);
create index if not exists exams_date_idx on public.exams(exam_date);

-- ---------------------------------------------------------------------
-- 3. STUDENT CARD CHECKS
-- ---------------------------------------------------------------------
create table if not exists public.student_card_checks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references public.students(id) on delete cascade,
  checked_by  uuid references public.users(id) on delete set null,
  valid       boolean not null,
  reason      text not null,
  location    text,
  created_at  timestamptz not null default now()
);

create index if not exists student_card_checks_created_idx on public.student_card_checks(created_at desc);

-- ---------------------------------------------------------------------
-- 4. RLS — зөвхөн service_role (Express API)
-- ---------------------------------------------------------------------
alter table public.broadcasts enable row level security;
alter table public.exams enable row level security;
alter table public.student_card_checks enable row level security;

revoke all on public.broadcasts, public.exams, public.student_card_checks from anon, authenticated;
grant all on public.broadcasts, public.exams, public.student_card_checks to service_role;

commit;
