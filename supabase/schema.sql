-- =============================================================
-- Supabase schema for SAPTCO bus-booking app (Firebase replacement).
-- Run this once in your Supabase project's SQL editor.
-- Safe to re-run: every statement is idempotent.
-- =============================================================

create extension if not exists "pgcrypto";

-- All visitor docs (formerly Firestore `pays` collection).
-- The `data` column is a free-form JSONB blob mirroring the
-- Firestore document shape so existing code paths keep working
-- without per-field migration.
create table if not exists public.pays (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists pays_updated_at_idx on public.pays (updated_at desc);

create table if not exists public.blocked_ips (
  ip text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_bins (
  bin text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Shallow-merge upsert used by the server for addData / handlePay / handleOtp.
-- SECURITY DEFINER + EXECUTE restricted to service_role means the function
-- can never be invoked by anon/authenticated clients directly.
create or replace function public.pays_merge(_id text, _patch jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.pays (id, data, updated_at)
  values (_id, coalesce(_patch, '{}'::jsonb), now())
  on conflict (id) do update
    set data = public.pays.data || coalesce(excluded.data, '{}'::jsonb),
        updated_at = now();
$$;

revoke execute on function public.pays_merge(text, jsonb) from public;
revoke execute on function public.pays_merge(text, jsonb) from anon;
revoke execute on function public.pays_merge(text, jsonb) from authenticated;
grant  execute on function public.pays_merge(text, jsonb) to   service_role;

-- =========== Row Level Security ===========
alter table public.pays         enable row level security;
alter table public.blocked_ips  enable row level security;
alter table public.blocked_bins enable row level security;

-- Drop any policies from previous installs.
drop policy if exists "anon_select_pays"              on public.pays;
drop policy if exists "anon_select_blocked_ips"       on public.blocked_ips;
drop policy if exists "anon_select_blocked_bins"      on public.blocked_bins;
drop policy if exists "authenticated_select_pays"     on public.pays;
drop policy if exists "authenticated_select_blocked_ips"  on public.blocked_ips;
drop policy if exists "authenticated_select_blocked_bins" on public.blocked_bins;

-- Reads are dashboard-only. The admin signs into Supabase Auth on login, so
-- their browser session has the `authenticated` role. Visitors never read
-- directly — all visitor reads go through the Express server (service_role,
-- which bypasses RLS). No anon policies are defined, so anon clients get
-- zero rows even if they have the anon key.
create policy "authenticated_select_pays"
  on public.pays for select to authenticated using (true);
create policy "authenticated_select_blocked_ips"
  on public.blocked_ips for select to authenticated using (true);
create policy "authenticated_select_blocked_bins"
  on public.blocked_bins for select to authenticated using (true);

-- All writes use the service-role key on the server, which bypasses RLS,
-- so we deliberately define no insert/update/delete policies.

-- =========== Realtime ===========
-- Add tables to the supabase_realtime publication if not already there.
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.pays';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.blocked_ips';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.blocked_bins';
  exception when duplicate_object then null;
  end;
end$$;

-- Ensure full row payloads are streamed (so subscribers see all fields, not just PKs).
alter table public.pays         replica identity full;
alter table public.blocked_ips  replica identity full;
alter table public.blocked_bins replica identity full;
