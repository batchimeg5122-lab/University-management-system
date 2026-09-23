-- =====================================================================
-- ИХ ЗАСАГ — Шат 3 (Санхүүгийн автоматжуулалт)
--   1) discount_rules        : Хөнгөлөлтийн дүрэм (GPA, хөтөлбөр, курс, оюутны жагсаалт)
--   2) invoices.last_reminded_at, reminder_count : Өр төлбөрийн сануулга
--   3) payments.transaction_reference index        : Банкны хуулга давхардал шалгах
-- Давтан ажиллуулахад аюулгүй. Бүх хандалт Express API (service_role)-ээр.
-- =====================================================================

begin;

create table if not exists public.discount_rules (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  kind        text not null check (kind in ('gpa', 'program', 'year_level', 'students')),
  -- Хувь ЭСВЭЛ тогтмол дүн (аль нэг нь)
  percent     numeric(5,2) check (percent is null or (percent > 0 and percent <= 100)),
  amount      numeric(14,2) check (amount is null or amount > 0),
  -- { min_gpa } | { program_ids: [] } | { year_levels: [] } | { student_codes: [] }
  params      jsonb not null default '{}'::jsonb,
  -- Хуримтлагдах эсэх: false бол зөвхөн хамгийн их хөнгөлөлт үйлчилнэ
  stackable   boolean not null default false,
  is_active   boolean not null default true,
  note        text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint discount_rules_value_check check ((percent is not null) <> (amount is not null))
);

alter table public.invoices add column if not exists last_reminded_at timestamptz;
alter table public.invoices add column if not exists reminder_count integer not null default 0;

create index if not exists invoices_open_due_idx on public.invoices(due_date) where status in ('pending', 'partial', 'overdue');
create index if not exists payments_reference_idx on public.payments(transaction_reference) where transaction_reference is not null;

alter table public.discount_rules enable row level security;
revoke all on public.discount_rules from anon, authenticated;
grant all on public.discount_rules to service_role;

commit;
