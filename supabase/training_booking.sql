-- Run this once in Supabase SQL Editor.
-- Real KinderBees training schedule + safe booking functions.

create or replace function public.get_training_schedule()
returns table (
  id uuid,
  training_date date,
  start_time time,
  end_time time,
  group_name text,
  location_name text,
  capacity integer,
  booked_count bigint,
  status public.training_status
)
language sql
security definer
set search_path = ''
as $$
  select
    ts.id,
    ts.training_date,
    ts.start_time,
    ts.end_time,
    tg.name as group_name,
    coalesce(l.name, 'Location TBC') as location_name,
    ts.capacity,
    count(b.id) filter (where b.status = 'booked') as booked_count,
    ts.status
  from public.training_sessions ts
  join public.training_groups tg on tg.id = ts.group_id
  left join public.locations l on l.id = ts.location_id
  left join public.bookings b on b.session_id = ts.id
  group by ts.id, tg.name, l.name
  order by ts.training_date, ts.start_time;
$$;

grant execute on function public.get_training_schedule() to anon, authenticated;


drop function if exists public.book_training(uuid, uuid);

create function public.book_training(
  p_session_id uuid,
  p_child_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_capacity integer;
  v_status public.training_status;
  v_booked integer;
  v_booking_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to book a training session.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'parent'
  ) then
    raise exception 'Only parent accounts can book training sessions.';
  end if;

  if not exists (
    select 1
    from public.children c
    where c.id = p_child_id
      and c.parent_id = v_user_id
  ) then
    raise exception 'You can only book training for your own child.';
  end if;

  select ts.capacity, ts.status
  into v_capacity, v_status
  from public.training_sessions ts
  where ts.id = p_session_id
  for update;

  if v_capacity is null then
    raise exception 'Training session not found.';
  end if;

  if v_status <> 'scheduled' then
    raise exception 'This training session is not available for booking.';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.session_id = p_session_id
      and b.child_id = p_child_id
      and b.status = 'booked'
  ) then
    raise exception 'This child is already booked for this training session.';
  end if;

  select count(*)::integer
  into v_booked
  from public.bookings b
  where b.session_id = p_session_id
    and b.status = 'booked';

  if v_booked >= v_capacity then
    raise exception 'This training session is full.';
  end if;

  insert into public.bookings (session_id, child_id, status)
  values (p_session_id, p_child_id, 'booked')
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

grant execute on function public.book_training(uuid, uuid) to authenticated;


create or replace function public.cancel_training_booking(
  p_booking_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_updated integer;
begin
  update public.bookings b
  set status = 'cancelled'
  where b.id = p_booking_id
    and b.status = 'booked'
    and exists (
      select 1
      from public.children c
      where c.id = b.child_id
        and c.parent_id = v_user_id
    );

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

grant execute on function public.cancel_training_booking(uuid) to authenticated;


notify pgrst, 'reload schema';
