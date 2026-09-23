-- =====================================================================
-- ИХ ЗАСАГ — Платформ тус бүрт НЭГ идэвхтэй нэвтрэлт
--   web дээр нэг, mobile дээр нэг session. Шинээр нэвтрэхэд өмнөх нь хүчингүй.
--   Supabase JWT-ийн session_id claim-ийг ашиглана (нэмэлт нууц хадгалахгүй).
-- Давтан ажиллуулахад аюулгүй.
-- =====================================================================
begin;

create table if not exists public.active_sessions (
  user_id     uuid not null references public.users(id) on delete cascade,
  platform    text not null check (platform in ('web', 'mobile')),
  session_id  text not null,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, platform)
);

create index if not exists active_sessions_seen_idx on public.active_sessions(last_seen_at desc);

alter table public.active_sessions enable row level security;
revoke all on public.active_sessions from anon, authenticated;
grant all on public.active_sessions to service_role;

commit;
