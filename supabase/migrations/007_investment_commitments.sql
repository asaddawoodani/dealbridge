-- ============================================================
-- 007_investment_commitments.sql
-- Investment commitment tracking system
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Add funding columns to deals
alter table public.deals
  add column if not exists target_raise numeric,
  add column if not exists total_committed numeric not null default 0;

-- 2. Create investment_commitments table
create table if not exists public.investment_commitments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals on delete cascade,
  investor_id uuid not null references auth.users on delete cascade,
  amount numeric not null check (amount > 0),
  status text not null default 'committed' check (status in ('draft','committed','funded','completed','cancelled')),
  commitment_date timestamptz not null default now(),
  funded_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create escrow_transactions table
create table if not exists public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.investment_commitments on delete cascade,
  type text not null check (type in ('deposit','release','refund')),
  amount numeric not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  stripe_payment_intent_id text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Auto-update updated_at on investment_commitments
create trigger set_investment_commitments_updated_at
  before update on public.investment_commitments
  for each row execute function update_updated_at();

-- 5. Unique partial index: prevent duplicate active commitments
create unique index if not exists idx_unique_active_commitment
  on public.investment_commitments (deal_id, investor_id)
  where status in ('draft', 'committed', 'funded');

-- 6. Trigger: auto-sum active commitments into deals.total_committed
create or replace function update_deal_total_committed()
returns trigger as $$
begin
  -- Update the deal for the affected row
  if TG_OP = 'DELETE' then
    update public.deals
    set total_committed = coalesce((
      select sum(amount) from public.investment_commitments
      where deal_id = OLD.deal_id and status in ('committed', 'funded', 'completed')
    ), 0)
    where id = OLD.deal_id;
    return OLD;
  else
    update public.deals
    set total_committed = coalesce((
      select sum(amount) from public.investment_commitments
      where deal_id = NEW.deal_id and status in ('committed', 'funded', 'completed')
    ), 0)
    where id = NEW.deal_id;
    -- Also update old deal if deal_id changed
    if TG_OP = 'UPDATE' and OLD.deal_id != NEW.deal_id then
      update public.deals
      set total_committed = coalesce((
        select sum(amount) from public.investment_commitments
        where deal_id = OLD.deal_id and status in ('committed', 'funded', 'completed')
      ), 0)
      where id = OLD.deal_id;
    end if;
    return NEW;
  end if;
end;
$$ language plpgsql;

drop trigger if exists trg_update_deal_total_committed on public.investment_commitments;
create trigger trg_update_deal_total_committed
  after insert or update or delete on public.investment_commitments
  for each row execute function update_deal_total_committed();

-- 7. Enable RLS
alter table public.investment_commitments enable row level security;
alter table public.escrow_transactions enable row level security;

-- 8. RLS policies for investment_commitments

-- Investors can read their own commitments
drop policy if exists "Investors read own commitments" on public.investment_commitments;
create policy "Investors read own commitments"
  on public.investment_commitments for select
  using (auth.uid() = investor_id);

-- Investors can insert their own commitments
drop policy if exists "Investors insert own commitments" on public.investment_commitments;
create policy "Investors insert own commitments"
  on public.investment_commitments for insert
  with check (auth.uid() = investor_id);

-- Operators can read commitments on their deals
drop policy if exists "Operators read deal commitments" on public.investment_commitments;
create policy "Operators read deal commitments"
  on public.investment_commitments for select
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id and d.operator_id = auth.uid()
    )
  );

-- Admins have full access
drop policy if exists "Admins full access commitments" on public.investment_commitments;
create policy "Admins full access commitments"
  on public.investment_commitments for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 9. RLS policies for escrow_transactions

-- Investors can read escrow for their commitments
drop policy if exists "Investors read own escrow" on public.escrow_transactions;
create policy "Investors read own escrow"
  on public.escrow_transactions for select
  using (
    exists (
      select 1 from public.investment_commitments ic
      where ic.id = commitment_id and ic.investor_id = auth.uid()
    )
  );

-- Operators can read escrow for commitments on their deals
drop policy if exists "Operators read deal escrow" on public.escrow_transactions;
create policy "Operators read deal escrow"
  on public.escrow_transactions for select
  using (
    exists (
      select 1 from public.investment_commitments ic
      join public.deals d on d.id = ic.deal_id
      where ic.id = commitment_id and d.operator_id = auth.uid()
    )
  );

-- Admins have full access to escrow
drop policy if exists "Admins full access escrow" on public.escrow_transactions;
create policy "Admins full access escrow"
  on public.escrow_transactions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
