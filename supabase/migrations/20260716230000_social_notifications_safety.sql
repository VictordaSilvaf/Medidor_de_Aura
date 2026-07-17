-- In-app social notifications, blocks and reports.

create type public.social_notification_type as enum (
  'follow',
  'post_like',
  'comment',
  'comment_like'
);

create table public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  type public.social_notification_type not null,
  analysis_id uuid references public.video_analyses (id) on delete cascade,
  comment_id uuid references public.post_comments (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint social_notifications_not_self check (recipient_id <> actor_id)
);

create index social_notifications_recipient_idx
  on public.social_notifications (recipient_id, created_at desc);

create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid references auth.users (id) on delete set null,
  analysis_id uuid references public.video_analyses (id) on delete set null,
  comment_id uuid references public.post_comments (id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  constraint content_reports_target check (
    reported_user_id is not null or analysis_id is not null or comment_id is not null
  )
);

alter table public.social_notifications enable row level security;
alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;

create policy "notifications_select_recipient"
  on public.social_notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);
create policy "notifications_update_recipient"
  on public.social_notifications for update to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);
create policy "notifications_delete_recipient"
  on public.social_notifications for delete to authenticated
  using ((select auth.uid()) = recipient_id);

create policy "blocks_select_own"
  on public.user_blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);
create policy "blocks_insert_own"
  on public.user_blocks for insert to authenticated
  with check ((select auth.uid()) = blocker_id);
create policy "blocks_delete_own"
  on public.user_blocks for delete to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "reports_select_own"
  on public.content_reports for select to authenticated
  using ((select auth.uid()) = reporter_id);
create policy "reports_insert_own"
  on public.content_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

grant select, update, delete on public.social_notifications to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.content_reports to authenticated;

create or replace function public.create_social_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  notification_type public.social_notification_type;
  target_analysis uuid;
  target_comment uuid;
begin
  if tg_table_name = 'follows' then
    recipient := new.following_id;
    notification_type := 'follow';
  elsif tg_table_name = 'post_likes' then
    select va.user_id into recipient
      from public.video_analyses va where va.id = new.analysis_id;
    notification_type := 'post_like';
    target_analysis := new.analysis_id;
  elsif tg_table_name = 'post_comments' then
    select va.user_id into recipient
      from public.video_analyses va where va.id = new.analysis_id;
    notification_type := 'comment';
    target_analysis := new.analysis_id;
    target_comment := new.id;
  elsif tg_table_name = 'comment_likes' then
    select pc.user_id, pc.analysis_id into recipient, target_analysis
      from public.post_comments pc where pc.id = new.comment_id;
    notification_type := 'comment_like';
    target_comment := new.comment_id;
  end if;

  if recipient is not null and recipient <> new.user_id then
    insert into public.social_notifications (
      recipient_id, actor_id, type, analysis_id, comment_id
    )
    values (
      recipient,
      case when tg_table_name = 'follows' then new.follower_id else new.user_id end,
      notification_type,
      target_analysis,
      target_comment
    );
  end if;
  return new;
end;
$$;
revoke all on function public.create_social_notification()
  from public, anon, authenticated;

-- Follows has different actor column names, so keep its trigger function small.
create or replace function public.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.social_notifications (recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;
revoke all on function public.create_follow_notification()
  from public, anon, authenticated;

create trigger follows_create_notification
after insert on public.follows
for each row execute function public.create_follow_notification();

create trigger post_likes_create_notification
after insert on public.post_likes
for each row execute function public.create_social_notification();

create trigger post_comments_create_notification
after insert on public.post_comments
for each row execute function public.create_social_notification();

create trigger comment_likes_create_notification
after insert on public.comment_likes
for each row execute function public.create_social_notification();
