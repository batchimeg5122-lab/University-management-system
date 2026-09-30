-- =====================================================================
-- ИХ ЗАСАГ — Хичээл цуцлах (Багш тухайн өдрийн хичээлээ цуцлах)
--   class_cancellations : нэг хуваарийн цагийн ТУХАЙН ӨДӨР цуцлагдсан бичлэг
-- Хуваарь (schedules) нь долоо хоног тутмын давтамжтай тул цуцлалтыг
-- тусдаа хүснэгтэд огноотой хамт хадгална. Ингэснээр зөвхөн тэр өдрийн
-- хичээл цуцлагдаж, дараагийн долоо хоногт хуваарь хэвийн үлдэнэ.
-- Давтан ажиллуулахад аюулгүй (idempotent). Бүх хандалт Express API (service_role)-ээр.
-- =====================================================================

begin;

create table if not exists public.class_cancellations (
  id            uuid primary key default gen_random_uuid(),
  schedule_id   uuid not null references public.schedules(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  cancel_date   date not null,
  reason        text check (reason is null or char_length(reason) <= 300),
  notified      integer not null default 0,          -- мэдэгдэл хүрсэн оюутны тоо
  cancelled_by  uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint class_cancellations_unique unique (schedule_id, cancel_date)
);

create index if not exists class_cancellations_date_idx on public.class_cancellations(cancel_date desc);
create index if not exists class_cancellations_course_idx on public.class_cancellations(course_id, cancel_date desc);

-- ---------------------------------------------------------------------
-- RLS — зөвхөн service_role (Express API)
-- ---------------------------------------------------------------------
alter table public.class_cancellations enable row level security;

revoke all on public.class_cancellations from anon, authenticated;
grant all on public.class_cancellations to service_role;

commit;
