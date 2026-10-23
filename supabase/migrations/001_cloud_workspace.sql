-- Ascend OS cloud workspace. Run in the Supabase SQL Editor.
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"tasks":[],"resources":[],"goals":[],"skills":[],"problems":[]}'::jsonb,
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz not null default now(),
  constraint user_workspaces_payload_is_object check (jsonb_typeof(data) = 'object'),
  constraint user_workspaces_tasks_are_array check (jsonb_typeof(data->'tasks') = 'array'),
  constraint user_workspaces_resources_are_array check (jsonb_typeof(data->'resources') = 'array'),
  constraint user_workspaces_goals_are_array check (jsonb_typeof(data->'goals') = 'array'),
  constraint user_workspaces_skills_are_array check (jsonb_typeof(data->'skills') = 'array'),
  constraint user_workspaces_problems_are_array check (jsonb_typeof(data->'problems') = 'array')
);

alter table public.user_workspaces enable row level security;
drop policy if exists "Users can manage only their own workspace" on public.user_workspaces;
create policy "Users can manage only their own workspace"
  on public.user_workspaces for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_workspaces to authenticated;

-- Private delivery log used only by the scheduled Edge Function (service/secret key).
create table if not exists public.reminder_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  due_local text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, task_id, due_local)
);
alter table public.reminder_deliveries enable row level security;
-- Deliberately no authenticated-user policies on reminder_deliveries. Client browsers must not read or write delivery records.