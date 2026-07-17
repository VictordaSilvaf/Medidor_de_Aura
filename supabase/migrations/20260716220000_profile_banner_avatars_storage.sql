-- Profile banner + public avatars storage bucket.

alter table public.profiles
  add column if not exists banner_url text;

-- Trigram search helpers for username / display_name discovery.
create extension if not exists pg_trgm;

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);

-- Storage buckets for public profile images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
),
(
  'banners',
  'banners',
  true,
  8388608, -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {user_id}/{avatar|banner}.{ext}
-- SELECT is also required by Storage when replacing an object with upsert.
create policy "profile_images_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile_images_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
