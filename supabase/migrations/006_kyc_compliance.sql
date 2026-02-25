-- ============================================================
-- 006_kyc_compliance.sql
-- Adds KYC (Know Your Customer) compliance system
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Add kyc_status to profiles
alter table public.profiles
  add column if not exists kyc_status text not null default 'none'
  check (kyc_status in ('none', 'pending', 'approved', 'rejected', 'expired'));

-- 2. Create kyc_submissions table
create table if not exists public.kyc_submissions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,

  -- Step 1: Personal Info
  full_legal_name     text not null,
  date_of_birth       date not null,
  nationality         text not null,
  tax_id_type         text,
  tax_id_hash         text,
  address_line1       text not null,
  address_line2       text,
  city                text not null,
  state_province      text not null,
  postal_code         text not null,
  country             text not null,

  -- Step 2: Identity Verification
  id_document_type    text not null check (id_document_type in ('passport', 'drivers_license', 'national_id')),
  id_document_path    text not null,
  selfie_path         text,

  -- Step 3: Source of Funds
  source_of_funds     text not null check (source_of_funds in ('employment', 'business', 'investments', 'inheritance', 'other')),
  source_details      text,
  expected_investment_range text,

  -- Step 4: Declaration
  pep_status          boolean not null default false,
  pep_details         text,
  terms_accepted      boolean not null default false,
  declaration_signed  boolean not null default false,

  -- Review
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected', 'expired')),
  risk_level          text check (risk_level in ('low', 'medium', 'high')),
  rejection_reason    text,
  reviewed_by         uuid references auth.users on delete set null,
  reviewed_at         timestamptz,
  expires_at          timestamptz,

  -- Timestamps
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 3. Enable RLS
alter table public.kyc_submissions enable row level security;

-- 4. RLS: users can read their own KYC submissions
drop policy if exists "Users can read own kyc submissions" on public.kyc_submissions;
create policy "Users can read own kyc submissions"
  on public.kyc_submissions for select
  using (auth.uid() = user_id);

-- 5. RLS: users can insert their own KYC submissions
drop policy if exists "Users can insert own kyc submissions" on public.kyc_submissions;
create policy "Users can insert own kyc submissions"
  on public.kyc_submissions for insert
  with check (auth.uid() = user_id);

-- 6. RLS: admins can read all KYC submissions
drop policy if exists "Admins can read all kyc submissions" on public.kyc_submissions;
create policy "Admins can read all kyc submissions"
  on public.kyc_submissions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 7. RLS: admins can update all KYC submissions
drop policy if exists "Admins can update all kyc submissions" on public.kyc_submissions;
create policy "Admins can update all kyc submissions"
  on public.kyc_submissions for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 8. Reuse existing update_updated_at trigger
drop trigger if exists set_updated_at on public.kyc_submissions;
create trigger set_updated_at
  before update on public.kyc_submissions
  for each row execute function public.update_updated_at();

-- 9. Create storage bucket for KYC documents (run in Supabase dashboard if needed)
-- insert into storage.buckets (id, name, public) values ('kyc-documents', 'kyc-documents', false);
