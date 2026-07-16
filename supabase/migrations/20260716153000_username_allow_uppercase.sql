-- Allow uppercase letters in usernames; uniqueness stays case-insensitive.

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9_]{3,24}$');

alter table public.profiles
  drop constraint if exists profiles_username_unique;

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username));
