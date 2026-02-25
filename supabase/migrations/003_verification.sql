-- ============================================================
-- 003_verification.sql
-- Adds verification flow for investors and operators
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Add verification_status to profiles
alter table public.profiles
  add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

-- 2. Create verification_requests table
create table if not exists public.verification_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  role                text not null check (role in ('investor', 'operator')),
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),

  -- Investor fields
  full_legal_name     text,
  phone               text,
  accreditation_type  text,
  proof_description   text,
  self_certified      boolean default false,

  -- Operator fields
  business_name       text,
  business_type       text,
  ein_registration    text,
  business_address    text,
  business_description text,
  years_in_operation  text,

  -- Admin review fields
  rejection_reason    text,
  reviewed_by         uuid references auth.users on delete set null,
  reviewed_at         timestamptz,

  -- Timestamps
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 3. Enable RLS
alter table public.verification_requests enable row level security;

-- 4. RLS: users can read their own verification requests
drop policy if exists "Users can read own verification requests" on public.verification_requests;
create policy "Users can read own verification requests"
  on public.verification_requests for select
  using (auth.uid() = user_id);

-- 5. RLS: users can insert their own verification requests
drop policy if exists "Users can insert own verification requests" on public.verification_requests;
create policy "Users can insert own verification requests"
  on public.verification_requests for insert
  with check (auth.uid() = user_id);

-- 6. RLS: admins can read all verification requests
drop policy if exists "Admins can read all verification requests" on public.verification_requests;
create policy "Admins can read all verification requests"
  on public.verification_requests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 7. RLS: admins can update all verification requests
drop policy if exists "Admins can update all verification requests" on public.verification_requests;
create policy "Admins can update all verification requests"
  on public.verification_requests for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 8. Reuse existing update_updated_at trigger
drop trigger if exists set_updated_at on public.verification_requests;
create trigger set_updated_at
  before update on public.verification_requests
  for each row execute function public.update_updated_at();
