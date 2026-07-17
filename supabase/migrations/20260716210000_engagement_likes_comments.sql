-- Post likes, comments, comment likes + denormalized counters.

alter table public.video_analyses
  add column if not exists like_count integer not null default 0 check (like_count >= 0),
  add column if not exists comment_count integer not null default 0 check (comment_count >= 0);

create table public.post_likes (
  analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (analysis_id, user_id)
);

create index post_likes_user_id_idx on public.post_likes (user_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  parent_id uuid references public.post_comments (id) on delete cascade,
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint post_comments_body_length check (char_length(body) between 1 and 500)
);

create index post_comments_analysis_id_idx
  on public.post_comments (analysis_id, created_at desc)
  where deleted_at is null;

create table public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_likes_user_id_idx on public.comment_likes (user_id);

-- Counter triggers run as their owner because engagement writes often update
-- a post/comment owned by another user. EXECUTE is revoked below; these
-- functions are only entry points for their triggers.
create or replace function public.bump_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.video_analyses
      set like_count = like_count + 1
      where id = new.analysis_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.video_analyses
      set like_count = greatest(0, like_count - 1)
      where id = old.analysis_id;
    return old;
  end if;
  return null;
end;
$$;
revoke all on function public.bump_post_like_count() from public, anon, authenticated;

create trigger post_likes_bump_count
after insert or delete on public.post_likes
for each row execute function public.bump_post_like_count();

create or replace function public.bump_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.video_analyses
      set comment_count = comment_count + 1
      where id = new.analysis_id;
    return new;
  elsif tg_op = 'UPDATE' then
    -- Soft-delete: only when deleted_at flips null → non-null
    if old.deleted_at is null and new.deleted_at is not null then
      update public.video_analyses
        set comment_count = greatest(0, comment_count - 1)
        where id = new.analysis_id;
    elsif old.deleted_at is not null and new.deleted_at is null then
      update public.video_analyses
        set comment_count = comment_count + 1
        where id = new.analysis_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.deleted_at is null then
      update public.video_analyses
        set comment_count = greatest(0, comment_count - 1)
        where id = old.analysis_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;
revoke all on function public.bump_post_comment_count() from public, anon, authenticated;

create trigger post_comments_bump_count
after insert or update or delete on public.post_comments
for each row execute function public.bump_post_comment_count();

create or replace function public.bump_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.post_comments
      set like_count = like_count + 1
      where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.post_comments
      set like_count = greatest(0, like_count - 1)
      where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;
revoke all on function public.bump_comment_like_count() from public, anon, authenticated;

create trigger comment_likes_bump_count
after insert or delete on public.comment_likes
for each row execute function public.bump_comment_like_count();

-- Helpers: is the analysis publicly readable (or owned)?
create or replace function public.analysis_is_engageable(target_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.video_analyses va
    where va.id = target_id
      and (
        (select auth.uid()) = va.user_id
        or (va.visibility = 'public' and va.status = 'completed')
      )
  );
$$;

grant execute on function public.analysis_is_engageable(uuid) to authenticated;

-- RLS
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.comment_likes enable row level security;

create policy "post_likes_select_engageable"
  on public.post_likes for select to authenticated
  using (public.analysis_is_engageable(analysis_id));

create policy "post_likes_insert_own"
  on public.post_likes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.analysis_is_engageable(analysis_id)
  );

create policy "post_likes_delete_own"
  on public.post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "post_comments_select_engageable"
  on public.post_comments for select to authenticated
  using (
    deleted_at is null
    and public.analysis_is_engageable(analysis_id)
  );

create policy "post_comments_insert_own"
  on public.post_comments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and deleted_at is null
    and public.analysis_is_engageable(analysis_id)
  );

create policy "post_comments_update_own"
  on public.post_comments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "post_comments_delete_own"
  on public.post_comments for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "comment_likes_select"
  on public.comment_likes for select to authenticated
  using (
    exists (
      select 1
      from public.post_comments c
      where c.id = comment_id
        and c.deleted_at is null
        and public.analysis_is_engageable(c.analysis_id)
    )
  );

create policy "comment_likes_insert_own"
  on public.comment_likes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.post_comments c
      where c.id = comment_id
        and c.deleted_at is null
        and public.analysis_is_engageable(c.analysis_id)
    )
  );

create policy "comment_likes_delete_own"
  on public.comment_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, delete on public.comment_likes to authenticated;
