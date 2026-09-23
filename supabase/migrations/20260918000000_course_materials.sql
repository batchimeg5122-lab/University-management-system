-- =====================================================================
-- Хичээлийн нэмэлт материал (лекц, гарын авлага, бие даалтын заавар г.м.)
--   * Багш зөвхөн ӨӨРИЙН заадаг хичээлд материал нэмнэ
--   * Тухайн хичээлд бүртгэлтэй оюутнууд нийтэлсэн материалыг харна
--   * Файлууд Supabase Storage-ийн "course-materials" bucket-д хадгалагдана
-- Supabase → SQL Editor дээр ажиллуулна.
-- =====================================================================

create table if not exists public.course_materials (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  uploaded_by  uuid references public.users(id) on delete set null,
  title        text not null,
  description  text,
  -- Storage доторх зам: <course_id>/<uuid>.<ext>
  file_path    text not null unique,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_course_materials_course on public.course_materials (course_id, created_at desc);

-- Эрхийн шалгалтад ашиглах туслах функцууд ------------------------------
create or replace function public.is_course_teacher(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.courses c
    join public.employees e on e.id = c.teacher_id
    where c.id = p_course_id and e.user_id = auth.uid()
  );
$$;

create or replace function public.is_course_student(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments en
    join public.students s on s.id = en.student_id
    where en.course_id = p_course_id and s.user_id = auth.uid() and en.status <> 'dropped'
  );
$$;

create or replace function public.is_academic_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role in ('super_admin', 'academic', 'management') and u.status = 'active'
  );
$$;

-- RLS -------------------------------------------------------------------
alter table public.course_materials enable row level security;

drop policy if exists course_materials_select on public.course_materials;
create policy course_materials_select on public.course_materials
  for select to authenticated
  using (
    public.is_course_teacher(course_id)
    or public.is_academic_staff()
    or (is_published and public.is_course_student(course_id))
  );

drop policy if exists course_materials_insert on public.course_materials;
create policy course_materials_insert on public.course_materials
  for insert to authenticated
  with check (public.is_course_teacher(course_id) or public.is_academic_staff());

drop policy if exists course_materials_update on public.course_materials;
create policy course_materials_update on public.course_materials
  for update to authenticated
  using (public.is_course_teacher(course_id) or public.is_academic_staff())
  with check (public.is_course_teacher(course_id) or public.is_academic_staff());

drop policy if exists course_materials_delete on public.course_materials;
create policy course_materials_delete on public.course_materials
  for delete to authenticated
  using (public.is_course_teacher(course_id) or public.is_academic_staff());

grant select, insert, update, delete on public.course_materials to authenticated;
grant all on public.course_materials to service_role;

-- updated_at автоматаар шинэчлэх
create or replace function public.trg_course_materials_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists course_materials_touch on public.course_materials;
create trigger course_materials_touch before update on public.course_materials
  for each row execute function public.trg_course_materials_touch();

-- =====================================================================
-- Storage bucket (хувийн, зөвхөн эрхтэй хүн татна)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('course-materials', 'course-materials', false, 52428800) -- 50 MB
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Файлын зам нь <course_id>/<файл> тул эхний хэсгээс хичээлийг тодорхойлно
drop policy if exists course_materials_objects_select on storage.objects;
create policy course_materials_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-materials'
    and (
      public.is_course_teacher(((storage.foldername(name))[1])::uuid)
      or public.is_academic_staff()
      or public.is_course_student(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists course_materials_objects_insert on storage.objects;
create policy course_materials_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-materials'
    and (public.is_course_teacher(((storage.foldername(name))[1])::uuid) or public.is_academic_staff())
  );

drop policy if exists course_materials_objects_delete on storage.objects;
create policy course_materials_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-materials'
    and (public.is_course_teacher(((storage.foldername(name))[1])::uuid) or public.is_academic_staff())
  );
