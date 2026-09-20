-- AYTECH Fitness / Supabase tek-kullanıcı-per-user state tablosu
create table if not exists public.fitness_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.fitness_state enable row level security;

drop policy if exists "fitness_state_select_own" on public.fitness_state;
create policy "fitness_state_select_own"
on public.fitness_state for select
using (auth.uid() = user_id);

drop policy if exists "fitness_state_insert_own" on public.fitness_state;
create policy "fitness_state_insert_own"
on public.fitness_state for insert
with check (auth.uid() = user_id);

drop policy if exists "fitness_state_update_own" on public.fitness_state;
create policy "fitness_state_update_own"
on public.fitness_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
