-- =====================================================================
-- ИХ ЗАСАГ — MOBILE APP дэмжлэг
--   1) push_tokens         : Expo push notification token
--   2) student-images      : оюутны профайл зураг (public bucket)
--   3) teacher-images      : багш/ажилтны профайл зураг (public bucket)
--
-- Хамаарал: v3 schema + v3.1 + v3.2 migration ажилласан байх
-- Давтан ажиллуулахад аюулгүй (idempotent)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. PUSH TOKENS
-- ---------------------------------------------------------------------
create table if not exists public.push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  token         text not null unique,
  platform      text not null default 'android' check (platform in ('ios', 'android', 'web')),
  device_name   text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

-- Зөвхөн Express API (service_role) хандана. Client-ээс шууд хандах эрхгүй.
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
grant all on public.push_tokens to service_role;

-- Хэрэглэгч өөрийн token-оо харах боломж (шаардлагатай бол)
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. PROFILE IMAGE BUCKETS (public read, 5 MB, зөвхөн зураг)
--    Байршуулалт нь API-ийн signed upload URL-аар хийгдэнэ.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-images', 'student-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('teacher-images', 'teacher-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Хэрэглэгч зөвхөн өөрийн хавтсанд (<user_id>/...) бичих, устгах эрхтэй
drop policy if exists profile_images_insert_own on storage.objects;
create policy profile_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('student-images', 'teacher-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_images_delete_own on storage.objects;
create policy profile_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('student-images', 'teacher-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- Шалгах:
-- select * from public.push_tokens limit 5;
-- select id, public, file_size_limit from storage.buckets where id like '%-images';
