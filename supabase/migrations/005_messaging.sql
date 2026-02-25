-- ============================================================
-- 005_messaging.sql
-- Conversations and messages between investors and operators
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Conversations table
create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references public.deals(id) on delete cascade,
  investor_id   uuid not null references auth.users(id) on delete cascade,
  operator_id   uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One conversation per investor per deal
alter table public.conversations
  add constraint conversations_deal_investor_unique unique (deal_id, investor_id);

-- 2. Messages table
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

-- 3. Triggers
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function update_updated_at();

-- 4. Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: participants can see their own
drop policy if exists "Participants can read own conversations" on public.conversations;
create policy "Participants can read own conversations"
  on public.conversations for select
  using (auth.uid() = investor_id or auth.uid() = operator_id);

-- Conversations: admins can see all
drop policy if exists "Admins can read all conversations" on public.conversations;
create policy "Admins can read all conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Messages: participants can read messages in their conversations
drop policy if exists "Participants can read conversation messages" on public.messages;
create policy "Participants can read conversation messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.investor_id = auth.uid() or c.operator_id = auth.uid())
    )
  );

-- Messages: participants can insert messages
drop policy if exists "Participants can insert messages" on public.messages;
create policy "Participants can insert messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.investor_id = auth.uid() or c.operator_id = auth.uid())
    )
  );

-- Messages: participants can update (mark as read)
drop policy if exists "Participants can update messages" on public.messages;
create policy "Participants can update messages"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.investor_id = auth.uid() or c.operator_id = auth.uid())
    )
  );

-- Messages: admins can read all
drop policy if exists "Admins can read all messages" on public.messages;
create policy "Admins can read all messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 5. Enable realtime on messages
alter publication supabase_realtime add table public.messages;

-- 6. Indexes for performance
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at);
create index if not exists idx_conversations_investor_id on public.conversations(investor_id);
create index if not exists idx_conversations_operator_id on public.conversations(operator_id);
create index if not exists idx_conversations_last_message_at on public.conversations(last_message_at desc nulls last);
