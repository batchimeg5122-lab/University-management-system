-- =====================================================================
-- Хуваарь гаргалтыг боловсронгуй болгох
--   * Хичээлийн төрөл: лекц / семинар / лаборатори / шалгалт
--   * НЭГДСЭН ЛЕКЦ: нэг багш, нэг өрөөнд хэд хэдэн ангид зэрэг заана
--   * Онлайн хичээл: өрөө эзэлдэггүй
--   * Өрөөний бүртгэл, багтаамж
-- Өмнөх: 20260917000000_schedule_conflicts.sql
-- =====================================================================

-- 1. Хуваарийн нэмэлт талбарууд ---------------------------------------
alter table public.schedules
  add column if not exists session_type text not null default 'lecture',
  add column if not exists is_online    boolean not null default false,
  add column if not exists group_id     uuid,     -- нэгдсэн лекцийн бүлэг
  add column if not exists note         text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'schedules_session_type_check') then
    alter table public.schedules
      add constraint schedules_session_type_check check (session_type in ('lecture', 'seminar', 'lab', 'exam'));
  end if;
end $$;

create index if not exists idx_schedules_group on public.schedules (group_id) where group_id is not null;

-- 2. Өрөөний бүртгэл ---------------------------------------------------
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  building   text not null,
  code       text not null,
  capacity   integer not null default 40 check (capacity > 0),
  room_type  text not null default 'lecture' check (room_type in ('lecture', 'seminar', 'lab', 'other')),
  note       text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (building, code)
);

-- Одоо байгаа хуваариас өрөөнүүдийг үүсгэнэ
insert into public.rooms (building, code, capacity)
select distinct coalesce(s.building, 'I байр'), s.room, 40
from public.schedules s
where s.room is not null and btrim(s.room) <> ''
on conflict (building, code) do nothing;

alter table public.rooms enable row level security;

drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms for select to authenticated using (true);

drop policy if exists rooms_write on public.rooms;
create policy rooms_write on public.rooms for all to authenticated
  using (public.is_academic_staff()) with check (public.is_academic_staff());

grant select on public.rooms to authenticated;
grant all on public.rooms to service_role;

-- 3. Давхцлын шалгалтыг шинэчлэх ---------------------------------------
--    Нэг бүлгийн (нэгдсэн лекц) мөрүүд хоорондоо багш, өрөөгөөр давхцахгүй
--    Онлайн хичээл өрөө эзэлдэггүй
create or replace function public.assert_schedule_free(
  p_schedule_id uuid,
  p_course_id   uuid,
  p_day         smallint,
  p_start       time,
  p_end         time,
  p_room        text,
  p_building    text,
  p_group_id    uuid default null,
  p_is_online   boolean default false
) returns void
language plpgsql
as $$
declare
  v_course record;
  v_clash  record;
begin
  if p_end <= p_start then
    raise exception 'Дуусах цаг эхлэх цагаас хойш байх ёстой.' using errcode = '23514';
  end if;

  select semester_id, class_id, teacher_id into v_course
  from public.courses where id = p_course_id;

  perform pg_advisory_xact_lock(hashtext('schedules:' || v_course.semester_id::text || ':' || p_day::text));

  select s.id, s.room, s.building, co.class_id, co.teacher_id, sub.name as subject_name, cl.code as class_code
    into v_clash
  from public.schedules s
  join public.courses co on co.id = s.course_id
  left join public.subjects sub on sub.id = co.subject_id
  left join public.classes cl on cl.id = co.class_id
  where co.semester_id = v_course.semester_id
    and s.day_of_week = p_day
    and s.id is distinct from p_schedule_id
    -- нэгдсэн лекцийн нэг бүлгийн мөрүүдийг алгасна
    and (p_group_id is null or s.group_id is distinct from p_group_id)
    and s.start_time < p_end
    and p_start < s.end_time
    and (
         co.class_id = v_course.class_id
      or (v_course.teacher_id is not null and co.teacher_id = v_course.teacher_id)
      or (
            not p_is_online and not s.is_online
            and p_room is not null and lower(btrim(s.room)) = lower(btrim(p_room))
            and coalesce(s.building, '') = coalesce(p_building, '')
         )
    )
  order by (co.class_id = v_course.class_id) desc, (co.teacher_id = v_course.teacher_id) desc
  limit 1;

  if found then
    if v_clash.class_id = v_course.class_id then
      raise exception 'Энэ анги энэ цагт өөр хичээлтэй байна (%, %).', v_clash.subject_name, v_clash.class_code using errcode = '23P01';
    elsif v_course.teacher_id is not null and v_clash.teacher_id = v_course.teacher_id then
      raise exception 'Багш энэ цагт өөр хичээл заах хуваарьтай байна (%, %).', v_clash.subject_name, v_clash.class_code using errcode = '23P01';
    else
      raise exception '% % өрөө энэ цагт завгүй байна (%, %).', coalesce(p_building, ''), p_room, v_clash.subject_name, v_clash.class_code using errcode = '23P01';
    end if;
  end if;
end;
$$;

create or replace function public.trg_schedules_no_conflict()
returns trigger
language plpgsql
as $$
begin
  if not new.is_online and (new.room is null or btrim(new.room) = '') then
    raise exception 'Танхимын хичээлд өрөө заавал сонгоно.' using errcode = '23514';
  end if;
  perform public.assert_schedule_free(
    new.id, new.course_id, new.day_of_week::smallint, new.start_time, new.end_time,
    new.room, new.building, new.group_id, new.is_online
  );
  return new;
end;
$$;

drop trigger if exists schedules_no_conflict on public.schedules;
create trigger schedules_no_conflict
  before insert or update of course_id, day_of_week, start_time, end_time, room, building, group_id, is_online
  on public.schedules
  for each row execute function public.trg_schedules_no_conflict();
