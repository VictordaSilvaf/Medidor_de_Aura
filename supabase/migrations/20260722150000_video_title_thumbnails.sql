-- Optional title + multi-size thumbnails for video analyses.

alter table public.video_analyses
  add column if not exists title text,
  add column if not exists thumbnail_sm_url text,
  add column if not exists thumbnail_md_url text,
  add column if not exists thumbnail_lg_url text;

alter table public.video_analyses
  drop constraint if exists video_analyses_title_length;

alter table public.video_analyses
  add constraint video_analyses_title_length
  check (title is null or char_length(title) <= 80);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thumbnails',
  'thumbnails',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {user_id}/{analysis_id}/{sm|md|lg}.{ext}
create policy "thumbnails_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "thumbnails_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "thumbnails_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "thumbnails_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
