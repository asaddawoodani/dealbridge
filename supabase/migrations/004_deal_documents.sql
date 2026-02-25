-- ============================================================
-- 004_deal_documents.sql
-- Deal document uploads: table, RLS, storage bucket
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. deal_documents table
create table if not exists public.deal_documents (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name   text not null,
  file_type   text not null,
  file_label  text not null check (
    file_label in ('Pitch Deck', 'Financial Statements', 'Business Plan', 'Legal Documents', 'Other')
  ),
  file_size   bigint not null,
  storage_path text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Reuse the existing updated_at trigger function
create trigger set_deal_documents_updated_at
  before update on public.deal_documents
  for each row execute function update_updated_at();

-- 3. Enable RLS
alter table public.deal_documents enable row level security;

-- Authenticated users can read docs for active deals
drop policy if exists "Authenticated can read docs for active deals" on public.deal_documents;
create policy "Authenticated can read docs for active deals"
  on public.deal_documents for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.deals d where d.id = deal_id and d.status = 'active'
    )
  );

-- Operators can manage docs on their own deals
drop policy if exists "Operators can insert own deal docs" on public.deal_documents;
create policy "Operators can insert own deal docs"
  on public.deal_documents for insert
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_id and d.operator_id = auth.uid()
    )
  );

drop policy if exists "Operators can update own deal docs" on public.deal_documents;
create policy "Operators can update own deal docs"
  on public.deal_documents for update
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id and d.operator_id = auth.uid()
    )
  );

drop policy if exists "Operators can delete own deal docs" on public.deal_documents;
create policy "Operators can delete own deal docs"
  on public.deal_documents for delete
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id and d.operator_id = auth.uid()
    )
  );

-- Admins can do everything
drop policy if exists "Admins can manage all docs" on public.deal_documents;
create policy "Admins can manage all docs"
  on public.deal_documents for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 4. Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('deal-documents', 'deal-documents', false)
on conflict (id) do nothing;

-- Storage policies: authenticated users can insert/select/delete
-- Actual authorization is enforced in API routes via admin client
drop policy if exists "Auth users can upload deal docs" on storage.objects;
create policy "Auth users can upload deal docs"
  on storage.objects for insert
  with check (bucket_id = 'deal-documents' and auth.uid() is not null);

drop policy if exists "Auth users can read deal docs" on storage.objects;
create policy "Auth users can read deal docs"
  on storage.objects for select
  using (bucket_id = 'deal-documents' and auth.uid() is not null);

drop policy if exists "Auth users can delete deal docs" on storage.objects;
create policy "Auth users can delete deal docs"
  on storage.objects for delete
  using (bucket_id = 'deal-documents' and auth.uid() is not null);
