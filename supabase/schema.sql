-- ============================================================
-- TalkToHuman — Supabase schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.human_presence (
  id int primary key default 1,
  is_online boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.human_presence (id, is_online)
  values (1, false)
  on conflict (id) do nothing;

create table if not exists public.waiting_users (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','accepted','cancelled')),
  room_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists waiting_users_status_idx on public.waiting_users(status);
create index if not exists waiting_users_user_idx on public.waiting_users(user_auth_id);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists chat_rooms_user_idx on public.chat_rooms(user_auth_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_type text not null check (sender_type in ('user','admin')),
  sender_id uuid not null,
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_room_idx on public.messages(room_id, created_at);

-- ---------- Helper function ----------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.admins where user_id = uid);
$$;

-- ---------- Row Level Security ----------
-- All WRITES happen only through the Next.js API routes using the
-- SERVICE ROLE key (which bypasses RLS entirely). These policies only
-- grant SELECT to the browser (anon/authenticated key), scoped so a
-- visitor can only ever see their own data, and the admin can see
-- everything. No INSERT/UPDATE/DELETE policies are defined for the
-- client roles, so direct writes from the browser are denied by default.

alter table public.human_presence enable row level security;
alter table public.waiting_users enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.messages enable row level security;
alter table public.admins enable row level security;

-- human_presence: status is not sensitive, anyone can read it
create policy "presence readable by anyone"
  on public.human_presence for select
  using (true);

-- waiting_users: only your own row, or the admin
create policy "own waiting row or admin"
  on public.waiting_users for select
  using (auth.uid() = user_auth_id or public.is_admin(auth.uid()));

-- chat_rooms: only your own room, or the admin
create policy "own room or admin"
  on public.chat_rooms for select
  using (auth.uid() = user_auth_id or public.is_admin(auth.uid()));

-- messages: only messages belonging to a room you own, or the admin
create policy "messages in own room or admin"
  on public.messages for select
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.chat_rooms r
      where r.id = messages.room_id
        and r.user_auth_id = auth.uid()
    )
  );

-- admins table: no one needs to read this from the client
-- (checked server-side via the service role key only)

-- ---------- Realtime ----------
-- Enable Realtime replication for the tables the UI subscribes to.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_rooms;
alter publication supabase_realtime add table public.waiting_users;
alter publication supabase_realtime add table public.human_presence;

-- ============================================================
-- After running this file, make the admin account:
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user
--    (use a real email + a strong password, "Auto confirm" ON)
-- 2. Copy that user's UID
-- 3. Run:  insert into public.admins (user_id) values ('paste-uid-here');
-- ============================================================
