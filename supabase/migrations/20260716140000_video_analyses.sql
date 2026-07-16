-- Video analysis pipeline: storage metadata, queue status, results, push tokens.
-- Apply with: supabase db push / supabase migration up

create extension if not exists "pgcrypto";

create type public.video_source as enum ('camera', 'gallery');

create type public.video_analysis_status as enum (
  'pending_upload',
  'uploaded',
  'queued',
  'processing',
  'completed',
  'failed'
);

create table public.video_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.video_analysis_status not null default 'pending_upload',
  source public.video_source not null,
  storage_key text,
  content_type text,
  duration_ms integer,
  file_size_bytes bigint,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index video_analyses_user_id_idx on public.video_analyses (user_id);
create index video_analyses_status_queued_idx
  on public.video_analyses (status, created_at)
  where status in ('queued', 'processing');

create table public.video_analysis_results (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.video_analyses (id) on delete cascade,
  tier_id text not null,
  score integer not null check (score >= 0),
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.video_analysis_events (
  id bigserial primary key,
  analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  step text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index video_analysis_events_analysis_id_idx
  on public.video_analysis_events (analysis_id, created_at);

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null,
  updated_at timestamptz not null default now(),
  constraint device_push_tokens_user_token_unique unique (user_id, token)
);

create index device_push_tokens_user_id_idx on public.device_push_tokens (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger video_analyses_set_updated_at
before update on public.video_analyses
for each row execute function public.set_updated_at();

alter table public.video_analyses enable row level security;
alter table public.video_analysis_results enable row level security;
alter table public.video_analysis_events enable row level security;
alter table public.device_push_tokens enable row level security;

create policy "Users select own analyses"
  on public.video_analyses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own analyses"
  on public.video_analyses
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own analyses"
  on public.video_analyses
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users select own results"
  on public.video_analysis_results
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.video_analyses a
      where a.id = analysis_id
        and a.user_id = (select auth.uid())
    )
  );

create policy "Users select own events"
  on public.video_analysis_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.video_analyses a
      where a.id = analysis_id
        and a.user_id = (select auth.uid())
    )
  );

create policy "Users manage own push tokens"
  on public.device_push_tokens
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.video_analyses to authenticated;
grant select on public.video_analysis_results to authenticated;
grant select on public.video_analysis_events to authenticated;
grant select, insert, update, delete on public.device_push_tokens to authenticated;

-- Realtime for processing screen
alter publication supabase_realtime add table public.video_analyses;
