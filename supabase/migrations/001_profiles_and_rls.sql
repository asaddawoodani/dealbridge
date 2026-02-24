-- ============================================================
-- 001_profiles_and_rls.sql
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Profiles table
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'investor' check (role in ('investor', 'operator', 'admin')),
  avatar_url  text,
  email_verified boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Profiles RLS
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 2. Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'investor')
  );
  return new;
end;
$$;

-- Drop if exists to allow re-running
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Trigger: auto-update updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- 4. Add user_id to investor_profiles
alter table public.investor_profiles
  add column if not exists user_id uuid references auth.users on delete cascade;

-- 5. Add user_id to deal_interests
alter table public.deal_interests
  add column if not exists user_id uuid references auth.users on delete cascade;

-- 6. RLS on investor_profiles
alter table public.investor_profiles enable row level security;

drop policy if exists "Users can read own investor profiles" on public.investor_profiles;
create policy "Users can read own investor profiles"
  on public.investor_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own investor profiles" on public.investor_profiles;
create policy "Users can insert own investor profiles"
  on public.investor_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own investor profiles" on public.investor_profiles;
create policy "Users can update own investor profiles"
  on public.investor_profiles for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own investor profiles" on public.investor_profiles;
create policy "Users can delete own investor profiles"
  on public.investor_profiles for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can read all investor profiles" on public.investor_profiles;
create policy "Admins can read all investor profiles"
  on public.investor_profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 7. RLS on deal_interests
alter table public.deal_interests enable row level security;

drop policy if exists "Users can insert own interests" on public.deal_interests;
create policy "Users can insert own interests"
  on public.deal_interests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own interests" on public.deal_interests;
create policy "Users can read own interests"
  on public.deal_interests for select
  using (auth.uid() = user_id);

drop policy if exists "Admins manage all interests" on public.deal_interests;
create policy "Admins manage all interests"
  on public.deal_interests for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 8. RLS on deals
alter table public.deals enable row level security;

drop policy if exists "Public can read active deals" on public.deals;
create policy "Public can read active deals"
  on public.deals for select
  using (status = 'active');

drop policy if exists "Admins manage all deals" on public.deals;
create policy "Admins manage all deals"
  on public.deals for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 9. RLS on operator_applications
alter table public.operator_applications enable row level security;

drop policy if exists "Public can insert applications" on public.operator_applications;
create policy "Public can insert applications"
  on public.operator_applications for insert
  with check (true);

drop policy if exists "Admins manage all applications" on public.operator_applications;
create policy "Admins manage all applications"
  on public.operator_applications for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
