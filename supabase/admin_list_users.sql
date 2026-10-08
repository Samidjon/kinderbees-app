-- Run once in Supabase SQL Editor.
-- Allows an authenticated admin to list Auth users (including email)
-- without exposing auth.users directly to the browser.

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(
      p.full_name,
      split_part(coalesce(u.email, ''), '@', 1)
    )::text as full_name,
    coalesce(p.role, 'parent'::public.user_role) as role,
    coalesce(p.created_at, u.created_at) as created_at
  from auth.users as u
  left join public.profiles as p
    on p.id = u.id
  order by coalesce(p.created_at, u.created_at) desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
