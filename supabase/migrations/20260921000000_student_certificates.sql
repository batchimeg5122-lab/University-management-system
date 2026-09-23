-- =====================================================================
-- Оюутны тодорхойлолт (суралцаж байгаа тухай)
--   * Оюутан өөрөө авна, дугаар болон баталгаажуулах кодтой
--   * Гуравдагч этгээд кодоор нь шалгах боломжтой (нэвтрэхгүйгээр)
--   * Сургалтын алба бүх тодорхойлолтыг хардаг, хүчингүй болгож чадна
-- =====================================================================

create table if not exists public.student_certificates (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  number       text not null unique,            -- ТОД-2026-00042
  verify_code  text not null unique,            -- QR/шалгах код
  purpose      text not null default 'other',   -- зориулалт
  purpose_note text,
  include_gpa  boolean not null default false,  -- голч дүнг тодорхойлолтод оруулах эсэх
  -- Тухайн үеийн мэдээллийг хөлдөөж хадгална (дараа анги солигдсон ч тодорхойлолт хэвээр)
  snapshot     jsonb not null,
  issued_at    timestamptz not null default now(),
  valid_until  date,
  revoked_at   timestamptz,
  revoked_by   uuid references public.users(id) on delete set null
);

create index if not exists idx_certificates_student on public.student_certificates (student_id, issued_at desc);

alter table public.student_certificates enable row level security;

-- Оюутан зөвхөн өөрийнхөө тодорхойлолтыг харна, үүсгэнэ
drop policy if exists certificates_select on public.student_certificates;
create policy certificates_select on public.student_certificates
  for select to authenticated
  using (
    public.is_academic_staff()
    or exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
  );

drop policy if exists certificates_insert on public.student_certificates;
create policy certificates_insert on public.student_certificates
  for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()) or public.is_academic_staff());

drop policy if exists certificates_update on public.student_certificates;
create policy certificates_update on public.student_certificates
  for update to authenticated
  using (public.is_academic_staff()) with check (public.is_academic_staff());

grant select, insert, update on public.student_certificates to authenticated;
grant all on public.student_certificates to service_role;

-- ---------------------------------------------------------------------
-- Нэвтрэхгүйгээр шалгах: зөвхөн хамгийн бага мэдээллийг буцаана
-- ---------------------------------------------------------------------
create or replace function public.verify_certificate(p_code text)
returns table (
  number       text,
  full_name    text,
  student_code text,
  program_name text,
  class_name   text,
  status       text,
  issued_at    timestamptz,
  valid_until  date,
  is_valid     boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.number,
    c.snapshot->>'full_name',
    c.snapshot->>'student_code',
    c.snapshot->>'program_name',
    c.snapshot->>'class_name',
    c.snapshot->>'status',
    c.issued_at,
    c.valid_until,
    (c.revoked_at is null and (c.valid_until is null or c.valid_until >= current_date))
  from public.student_certificates c
  where upper(c.verify_code) = upper(p_code);
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
