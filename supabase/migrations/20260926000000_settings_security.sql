-- =====================================================================
-- ИХ ЗАСАГ — Шат 5: Системийн тохиргоо, нэвтрэлтийн түүх
-- Давтан ажиллуулахад аюулгүй. Хандалт Express API (service_role)-ээр.
-- 2FA (TOTP) нь Supabase Auth-ийн MFA-г ашиглана:
--   Dashboard → Authentication → Multi-Factor → TOTP "Enabled" байх
-- =====================================================================
begin;

create table if not exists public.system_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.login_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  platform    text not null default 'web' check (platform in ('web', 'mobile')),
  aal         text,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists login_history_user_idx on public.login_history(user_id, created_at desc);
create index if not exists login_history_created_idx on public.login_history(created_at desc);

alter table public.system_settings enable row level security;
alter table public.login_history enable row level security;
revoke all on public.system_settings, public.login_history from anon, authenticated;
grant all on public.system_settings, public.login_history to service_role;

commit;
