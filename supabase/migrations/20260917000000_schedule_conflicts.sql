-- =====================================================================
-- Хичээлийн хуваарийн давхцлыг ӨГӨГДЛИЙН САНГИЙН түвшинд хориглох
--   * Нэг улиралд, нэг гарагт, давхцах цагт:
--       - нэг анги хоёр хичээлтэй байж болохгүй
--       - нэг багш хоёр хичээл зааж болохгүй
--       - нэг өрөөнд хоёр хичээл орж болохгүй
--   * Хоёр ажилтан зэрэг хадгалахад (race condition) advisory lock хамгаална
--   * Хичээлийн багш/анги солиход ч шалгана
-- Supabase → SQL Editor дээр ажиллуулна.
-- =====================================================================

create or replace function public.assert_schedule_free(
  p_schedule_id uuid,
  p_course_id   uuid,
  p_day         smallint,
  p_start       time,
  p_end         time,
  p_room        text,
  p_building    text
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

  -- Нэг улирал, нэг гарагийн хуваарийг зэрэг өөрчлөхийг дараалалд оруулна
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
    and s.start_time < p_end
    and p_start < s.end_time
    and (
         co.class_id = v_course.class_id
      or (v_course.teacher_id is not null and co.teacher_id = v_course.teacher_id)
      or (p_room is not null and lower(trim(s.room)) = lower(trim(p_room)) and coalesce(s.building, '') = coalesce(p_building, ''))
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

-- ---------------------------------------------------------------------
-- schedules: нэмэх, засахад
-- ---------------------------------------------------------------------
create or replace function public.trg_schedules_no_conflict()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_schedule_free(new.id, new.course_id, new.day_of_week::smallint, new.start_time, new.end_time, new.room, new.building);
  return new;
end;
$$;

drop trigger if exists schedules_no_conflict on public.schedules;
create trigger schedules_no_conflict
  before insert or update of course_id, day_of_week, start_time, end_time, room, building
  on public.schedules
  for each row execute function public.trg_schedules_no_conflict();

-- ---------------------------------------------------------------------
-- courses: багш эсвэл анги солиход тухайн хичээлийн бүх цагийг шалгана
-- ---------------------------------------------------------------------
create or replace function public.trg_courses_schedule_conflict()
returns trigger
language plpgsql
as $$
declare
  s record;
begin
  if new.teacher_id is not distinct from old.teacher_id and new.class_id is not distinct from old.class_id then
    return new;
  end if;

  for s in select * from public.schedules where course_id = new.id loop
    perform pg_advisory_xact_lock(hashtext('schedules:' || new.semester_id::text || ':' || s.day_of_week::text));
    if exists (
      select 1
      from public.schedules o
      join public.courses co on co.id = o.course_id
      where co.semester_id = new.semester_id
        and o.course_id <> new.id
        and o.day_of_week = s.day_of_week
        and o.start_time < s.end_time
        and s.start_time < o.end_time
        and (co.class_id = new.class_id or (new.teacher_id is not null and co.teacher_id = new.teacher_id))
    ) then
      raise exception 'Шинэ багш/анги нь энэ хичээлийн хуваарийн цагт өөр хичээлтэй давхцаж байна.' using errcode = '23P01';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists courses_schedule_conflict on public.courses;
create trigger courses_schedule_conflict
  before update of teacher_id, class_id
  on public.courses
  for each row execute function public.trg_courses_schedule_conflict();

-- ---------------------------------------------------------------------
-- Хурдасгах индекс
-- ---------------------------------------------------------------------
create index if not exists idx_schedules_day_time on public.schedules (day_of_week, start_time, end_time);
create index if not exists idx_courses_semester_class_teacher on public.courses (semester_id, class_id, teacher_id);

-- ---------------------------------------------------------------------
-- Одоо байгаа давхцлуудыг шалгах (trigger-ээс өмнө орсон өгөгдөл)
-- ---------------------------------------------------------------------
-- select a.id, b.id, a.day_of_week, a.start_time, ca.class_id = cb.class_id as class_clash,
--        ca.teacher_id = cb.teacher_id as teacher_clash
-- from public.schedules a
-- join public.courses ca on ca.id = a.course_id
-- join public.schedules b on b.id > a.id and b.day_of_week = a.day_of_week
--      and b.start_time < a.end_time and a.start_time < b.end_time
-- join public.courses cb on cb.id = b.course_id and cb.semester_id = ca.semester_id
-- where ca.class_id = cb.class_id or ca.teacher_id = cb.teacher_id
--    or (a.room = b.room and coalesce(a.building,'') = coalesce(b.building,''));
