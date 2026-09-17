-- DBS Pricing Calculator - schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (uma vez só).

-- Sem isso, toda consulta das tabelas abaixo falha com "permission denied for
-- table ..." mesmo com as policies de RLS corretas - RLS só é consultado depois
-- que o grant de tabela permite a operação.
grant usage on schema public to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: espelha auth.users, guarda o "role" (admin | user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;

create policy "profiles: users read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: users update own name" on public.profiles
  for update using (auth.uid() = id);

-- cria automaticamente um profile (role 'user') quando alguém é criado em auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper usado nas policies abaixo
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- pricing_policy: linha única (id = 1) com os defaults de precificação
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_policy (
  id smallint primary key default 1 check (id = 1),
  overhead_pct numeric not null default 12,
  default_commission_pct numeric not null default 10,
  target_profit_pct numeric not null default 30,
  minimum_charge numeric not null default 350,
  discount_pct numeric not null default 0,
  tax_pct numeric not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.pricing_policy enable row level security;
grant select, insert, update on public.pricing_policy to authenticated;

create policy "pricing_policy: read for authenticated" on public.pricing_policy
  for select using (auth.role() = 'authenticated');

create policy "pricing_policy: admin write" on public.pricing_policy
  for insert with check (public.is_admin());

create policy "pricing_policy: admin update" on public.pricing_policy
  for update using (public.is_admin());

insert into public.pricing_policy (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- salespeople: comissão por vendedor
-- ---------------------------------------------------------------------------
create table if not exists public.salespeople (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  commission_pct numeric not null,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table public.salespeople enable row level security;
grant select, insert, update, delete on public.salespeople to authenticated;

create policy "salespeople: full access for authenticated" on public.salespeople
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- service_rules: benchmark de alocação de custo por categoria de serviço
-- ---------------------------------------------------------------------------
create table if not exists public.service_rules (
  id uuid primary key default gen_random_uuid(),
  service_name text not null unique,
  labor numeric not null,
  chemicals numeric not null,
  machine numeric not null,
  pads numeric not null,
  water numeric not null,
  vehicle numeric not null,
  maintenance numeric not null,
  depreciation numeric not null,
  admin numeric not null,
  commission numeric not null,
  profit numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.service_rules enable row level security;
grant select, insert, update on public.service_rules to authenticated;

create policy "service_rules: read for authenticated" on public.service_rules
  for select using (auth.role() = 'authenticated');

create policy "service_rules: admin insert" on public.service_rules
  for insert with check (public.is_admin());

create policy "service_rules: admin update" on public.service_rules
  for update using (public.is_admin());

insert into public.service_rules (service_name, labor, chemicals, machine, pads, water, vehicle, maintenance, depreciation, admin, commission, profit) values
  ('Grout / Tile / Steam', 38, 4, 4, 2, 1, 3, 2, 2, 4, 10, 30),
  ('Carpet Cleaning', 35, 5, 5, 1, 1, 3, 2, 3, 5, 10, 30),
  ('Floor Stripping & Waxing', 32, 8, 4, 3, 1, 3, 2, 3, 4, 10, 30),
  ('Floor Scrub / Auto-Scrub', 35, 5, 5, 2, 1, 3, 2, 2, 5, 10, 30),
  ('Window Cleaning', 40, 3, 2, 1, 1, 4, 2, 2, 5, 10, 30),
  ('Pressure Washing', 32, 3, 7, 0, 4, 4, 3, 4, 3, 10, 30),
  ('Deep Cleaning', 40, 6, 2, 1, 1, 3, 1, 1, 5, 10, 30),
  ('Upholstery / Chair', 38, 5, 4, 1, 1, 3, 2, 2, 4, 10, 30),
  ('Grout Restoration', 40, 5, 3, 2, 1, 3, 2, 2, 2, 10, 30),
  ('Specialty / Other', 37, 5, 4, 2, 1, 3, 2, 2, 4, 10, 30)
on conflict (service_name) do nothing;

-- ---------------------------------------------------------------------------
-- team_members: cartão de taxas, aprendido a partir dos orçamentos
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  rate numeric not null,
  updated_at timestamptz not null default now(),
  unique (name)
);

alter table public.team_members enable row level security;
grant select, insert, update, delete on public.team_members to authenticated;

create policy "team_members: full access for authenticated" on public.team_members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- quotes: histórico de orçamentos calculados
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  client text,
  location text,
  invoice text,
  service_date date,
  service text,
  pricing_mode text,
  labor_cost numeric not null default 0,
  direct_cost numeric not null default 0,
  dbs_price numeric not null default 0,
  discount_pct numeric not null default 0,
  discount_amt numeric not null default 0,
  tax_pct numeric not null default 0,
  tax_amt numeric not null default 0,
  client_total numeric not null default 0,
  price_per_unit numeric,
  overhead_pct numeric not null default 0,
  commission_pct numeric not null default 0,
  commission_amt numeric not null default 0,
  target_profit_pct numeric not null default 0,
  profit_amt numeric not null default 0,
  margin_pct numeric not null default 0,
  result_label text,
  salesperson text,
  efficiency_pct numeric,
  technicians jsonb,
  raw_inputs jsonb
);

alter table public.quotes enable row level security;
grant select, insert, delete on public.quotes to authenticated;

create policy "quotes: read for authenticated" on public.quotes
  for select using (auth.role() = 'authenticated');

create policy "quotes: insert own" on public.quotes
  for insert with check (auth.role() = 'authenticated');

create policy "quotes: admin delete" on public.quotes
  for delete using (public.is_admin());

create index if not exists quotes_created_at_idx on public.quotes (created_at desc);
