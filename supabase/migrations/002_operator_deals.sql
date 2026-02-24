-- ============================================================
-- 002_operator_deals.sql
-- Adds operator support to the deals table
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. New columns on deals
alter table public.deals
  add column if not exists operator_id uuid references auth.users on delete set null,
  add column if not exists timeline text,
  add column if not exists tags text[];

-- 2. RLS: operators can read their own deals (including pending)
drop policy if exists "Operators can read own deals" on public.deals;
create policy "Operators can read own deals"
  on public.deals for select
  using (auth.uid() = operator_id);

-- 3. RLS: operators can insert their own deals
drop policy if exists "Operators can insert own deals" on public.deals;
create policy "Operators can insert own deals"
  on public.deals for insert
  with check (
    auth.uid() = operator_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'operator'
    )
  );

-- 4. RLS: operators can update their own deals
drop policy if exists "Operators can update own deals" on public.deals;
create policy "Operators can update own deals"
  on public.deals for update
  using (
    auth.uid() = operator_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'operator'
    )
  );
