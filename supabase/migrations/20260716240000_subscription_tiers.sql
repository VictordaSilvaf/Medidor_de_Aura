-- VIP subscription tiers (RevenueCat → profiles) + analysis queue priority.

create type public.subscription_tier as enum (
  'free',
  'ascendente',
  'lendario',
  'divino'
);

alter table public.profiles
  add column if not exists subscription_tier public.subscription_tier not null default 'free',
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists revenuecat_app_user_id text;

alter table public.video_analyses
  add column if not exists priority integer not null default 0;

drop index if exists video_analyses_status_queued_idx;

create index video_analyses_status_queued_idx
  on public.video_analyses (status, priority desc, created_at asc)
  where status in ('queued', 'processing');

-- Count analyses that consume quota (confirmed uploads onward).
create or replace function public.count_analysis_quota(
  p_user_id uuid,
  p_day_start timestamptz,
  p_month_start timestamptz
)
returns table (daily_count bigint, monthly_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (
      where created_at >= p_day_start
    ) as daily_count,
    count(*) filter (
      where created_at >= p_month_start
    ) as monthly_count
  from public.video_analyses
  where user_id = p_user_id
    and status not in ('pending_upload', 'failed');
$$;

grant execute on function public.count_analysis_quota(uuid, timestamptz, timestamptz)
  to service_role;
