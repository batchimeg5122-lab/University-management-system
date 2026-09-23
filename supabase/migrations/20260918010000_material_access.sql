-- =====================================================================
-- Хичээлийн материалд оюутан хандсан (татсан) бүртгэл
--   * Оюутан татах бүрт тоолуур нэмэгдэнэ
--   * Багш өөрийн хичээлийн материалын хандалтыг хардаг
-- Supabase → SQL Editor дээр ажиллуулна.
-- (20260918000000_course_materials.sql-ийн ДАРАА)
-- =====================================================================

create table if not exists public.course_material_access (
  id             uuid primary key default gen_random_uuid(),
  material_id    uuid not null references public.course_materials(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  download_count integer not null default 1,
  first_at       timestamptz not null default now(),
  last_at        timestamptz not null default now(),
  unique (material_id, student_id)
);

create index if not exists idx_material_access_material on public.course_material_access (material_id);

alter table public.course_material_access enable row level security;

-- Оюутан зөвхөн ӨӨРИЙН хандалтаа бичнэ
drop policy if exists material_access_insert on public.course_material_access;
create policy material_access_insert on public.course_material_access
  for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()));

drop policy if exists material_access_update on public.course_material_access;
create policy material_access_update on public.course_material_access
  for update to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()));

-- Багш өөрийн хичээлийн, оюутан өөрийн бүртгэлийг харна
drop policy if exists material_access_select on public.course_material_access;
create policy material_access_select on public.course_material_access
  for select to authenticated
  using (
    public.is_academic_staff()
    or exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
    or exists (
      select 1 from public.course_materials m
      where m.id = material_id and public.is_course_teacher(m.course_id)
    )
  );

grant select, insert, update on public.course_material_access to authenticated;
grant all on public.course_material_access to service_role;
