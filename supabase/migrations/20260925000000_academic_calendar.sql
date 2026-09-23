-- =====================================================================
-- ИХ ЗАСАГ — Шат 4: Академик календарь
-- Давтан ажиллуулахад аюулгүй. Хандалт Express API (service_role)-ээр.
-- =====================================================================
begin;

create table if not exists public.academic_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 2 and 200),
  event_type  text not null default 'event' check (event_type in ('holiday', 'exam_week', 'registration', 'break', 'deadline', 'event')),
  start_date  date not null,
  end_date    date not null,
  description text,
  -- null = бүх хэрэглэгч, эсвэл тодорхой эрх
  target_role text check (target_role is null or target_role in ('super_admin', 'management', 'academic', 'finance', 'teacher', 'student')),
  semester_id uuid references public.semesters(id) on delete set null,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint academic_events_dates check (end_date >= start_date)
);

create index if not exists academic_events_range_idx on public.academic_events(start_date, end_date);

alter table public.academic_events enable row level security;
revoke all on public.academic_events from anon, authenticated;
grant all on public.academic_events to service_role;

commit;
