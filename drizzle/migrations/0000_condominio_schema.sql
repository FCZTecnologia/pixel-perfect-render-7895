create type public.app_role as enum ('admin','condomino');
create type public.unit_type as enum ('galpao','sala_comercial','residencial');
create type public.os_status as enum ('pendente','em_andamento','concluido','cancelado');
create type public.os_priority as enum ('baixa','media','alta');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.claim_admin_if_none()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(auth.uid(),'admin');
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(),'admin');
  return true;
end $$;
grant execute on function public.claim_admin_if_none() to authenticated;

create table public.units (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  unit_type public.unit_type not null default 'sala_comercial',
  owner_name text not null,
  email text not null,
  phone text,
  document text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.units to authenticated;
grant all on public.units to service_role;
alter table public.units enable row level security;

create or replace function public.owns_unit(_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.units u where u.id = _unit_id
    and lower(u.email) = lower(coalesce(auth.jwt()->>'email','')))
$$;

create policy "admin all units" on public.units for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "tenant reads own unit" on public.units for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt()->>'email','')));

create table public.consumption (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  reference_month date not null,
  energy_prev numeric not null default 0,
  energy_curr numeric not null default 0,
  water_prev numeric not null default 0,
  water_curr numeric not null default 0,
  total_amount numeric not null default 0,
  attachment_path text,
  created_at timestamptz not null default now(),
  unique (unit_id, reference_month)
);
grant select, insert, update, delete on public.consumption to authenticated;
grant all on public.consumption to service_role;
alter table public.consumption enable row level security;
create policy "admin all consumption" on public.consumption for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "tenant reads own consumption" on public.consumption for select to authenticated
  using (public.owns_unit(unit_id));

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  number serial,
  unit_id uuid not null references public.units(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  title text not null,
  category text not null default 'Manutenção',
  description text not null default '',
  priority public.os_priority not null default 'media',
  status public.os_status not null default 'pendente',
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.service_orders to authenticated;
grant usage on sequence public.service_orders_number_seq to authenticated;
grant all on public.service_orders to service_role;
alter table public.service_orders enable row level security;
create policy "admin all os" on public.service_orders for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "tenant reads own os" on public.service_orders for select to authenticated
  using (public.owns_unit(unit_id));
create policy "tenant creates own os" on public.service_orders for insert to authenticated
  with check (public.owns_unit(unit_id) and created_by = auth.uid() and status = 'pendente');

create table public.os_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.service_orders(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  from_admin boolean not null default false,
  message text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.os_messages to authenticated;
grant all on public.os_messages to service_role;
alter table public.os_messages enable row level security;
create policy "admin all messages" on public.os_messages for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "tenant reads own messages" on public.os_messages for select to authenticated
  using (exists (select 1 from public.service_orders o where o.id = order_id and public.owns_unit(o.unit_id)));
create policy "tenant writes own messages" on public.os_messages for insert to authenticated
  with check (author_id = auth.uid() and from_admin = false and exists (select 1 from public.service_orders o where o.id = order_id and public.owns_unit(o.unit_id)));

create or replace function public.owns_unit_path(_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare uid uuid;
begin
  begin uid := split_part(_name,'/',1)::uuid; exception when others then return false; end;
  return public.owns_unit(uid);
end $$;

create policy "admin manage anexos" on storage.objects for all to authenticated
  using (bucket_id = 'anexos' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'anexos' and public.has_role(auth.uid(),'admin'));
create policy "tenant read own anexos" on storage.objects for select to authenticated
  using (bucket_id = 'anexos' and public.owns_unit_path(name));
create policy "tenant upload own anexos" on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos' and public.owns_unit_path(name));