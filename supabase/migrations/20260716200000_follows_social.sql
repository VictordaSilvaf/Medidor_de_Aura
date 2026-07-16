-- Social graph: follows (Instagram / TikTok style).

create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);
create index follows_follower_id_idx on public.follows (follower_id);

alter table public.follows enable row level security;

create policy "follows_select_authenticated"
  on public.follows for select to authenticated
  using (true);

create policy "follows_insert_own"
  on public.follows for insert to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "follows_delete_own"
  on public.follows for delete to authenticated
  using ((select auth.uid()) = follower_id);

grant select, insert, delete on public.follows to authenticated;

-- Counts helper (security invoker so RLS on profiles still applies via joins).
create or replace function public.profile_social_counts(target_user_id uuid)
returns table (
  posts bigint,
  followers bigint,
  following bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.video_analyses va
      where va.user_id = target_user_id
        and va.status = 'completed'
        and va.visibility = 'public'
    ) as posts,
    (
      select count(*)::bigint
      from public.follows f
      where f.following_id = target_user_id
    ) as followers,
    (
      select count(*)::bigint
      from public.follows f
      where f.follower_id = target_user_id
    ) as following;
$$;

grant execute on function public.profile_social_counts(uuid) to authenticated;
