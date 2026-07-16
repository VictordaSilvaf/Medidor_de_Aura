-- Profiles, visibility, challenges, duel entries, XP gamification.

create type public.video_visibility as enum ('private', 'public');
create type public.challenge_type as enum (
  'weekly',
  'monthly',
  'seasonal',
  'duel',
  'community',
  'tier_hunt',
  'streak'
);
create type public.challenge_status as enum ('draft', 'active', 'ended');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  username text not null,
  avatar_url text,
  bio text not null default '',
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  total_aura integer not null default 0 check (total_aura >= 0),
  measurements integer not null default 0 check (measurements >= 0),
  best_tier_id text,
  streak_days integer not null default 0 check (streak_days >= 0),
  last_measure_date date,
  default_visibility public.video_visibility not null default 'private',
  is_public_profile boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  constraint profiles_username_unique unique (username)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.video_analyses
  add column if not exists visibility public.video_visibility not null default 'private',
  add column if not exists posted_at timestamptz,
  add column if not exists challenge_id uuid;

create index if not exists video_analyses_public_feed_idx
  on public.video_analyses (posted_at desc)
  where visibility = 'public' and status = 'completed';

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  type public.challenge_type not null,
  status public.challenge_status not null default 'draft',
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  reward_xp integer not null default 50 check (reward_xp >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  opponent_analysis_id uuid references public.video_analyses (id) on delete set null,
  opponent_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger challenges_set_updated_at
before update on public.challenges
for each row execute function public.set_updated_at();

create index challenges_status_idx on public.challenges (status, ends_at);

create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint challenge_participants_unique unique (challenge_id, user_id)
);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis_id uuid not null references public.video_analyses (id) on delete cascade,
  score integer not null check (score >= 0),
  tier_id text,
  created_at timestamptz not null default now(),
  constraint challenge_entries_analysis_unique unique (analysis_id)
);

create index challenge_entries_rank_idx
  on public.challenge_entries (challenge_id, score desc);

alter table public.video_analyses
  add constraint video_analyses_challenge_id_fkey
  foreign key (challenge_id) references public.challenges (id) on delete set null;

-- RLS
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_entries enable row level security;

create policy "Profiles are readable when public or own"
  on public.profiles for select to authenticated
  using (is_public_profile or (select auth.uid()) = user_id);

create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Public completed analyses visible to authenticated users
drop policy if exists "Users select own analyses" on public.video_analyses;
create policy "Users select own or public completed analyses"
  on public.video_analyses for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (visibility = 'public' and status = 'completed')
  );

create policy "Users select results for visible analyses"
  on public.video_analysis_results for select to authenticated
  using (
    exists (
      select 1 from public.video_analyses a
      where a.id = analysis_id
        and (
          a.user_id = (select auth.uid())
          or (a.visibility = 'public' and a.status = 'completed')
        )
    )
  );

create policy "Authenticated read active challenges"
  on public.challenges for select to authenticated
  using (
    status in ('active', 'ended')
    or created_by = (select auth.uid())
  );

create policy "Users create duels"
  on public.challenges for insert to authenticated
  with check (
    type = 'duel'
    and created_by = (select auth.uid())
  );

create policy "Users read challenge participants"
  on public.challenge_participants for select to authenticated
  using (true);

create policy "Users join challenges"
  on public.challenge_participants for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users read challenge entries"
  on public.challenge_entries for select to authenticated
  using (true);

create policy "Users insert own challenge entries"
  on public.challenge_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.challenges to authenticated;
grant select, insert on public.challenge_participants to authenticated;
grant select, insert on public.challenge_entries to authenticated;

-- Seed starter weekly + monthly challenges (titles localized in jsonb)
insert into public.challenges (type, status, title, description, rules, reward_xp, starts_at, ends_at)
values
  (
    'weekly',
    'active',
    '{"pt-BR":"Semana Cósmica","en":"Cosmic Week","es":"Semana Cósmica"}'::jsonb,
    '{"pt-BR":"Poste medições públicas e some o máximo de aura esta semana.","en":"Post public readings and stack the most aura this week.","es":"Publica mediciones y suma el máximo de aura esta semana."}'::jsonb,
    '{"min_visibility":"public","scoring":"sum_score"}'::jsonb,
    120,
    now() - interval '1 day',
    now() + interval '6 days'
  ),
  (
    'monthly',
    'active',
    '{"pt-BR":"Liga Mensal de Aura","en":"Monthly Aura League","es":"Liga Mensual de Aura"}'::jsonb,
    '{"pt-BR":"O maior score público do mês leva a coroa.","en":"Highest public score of the month takes the crown.","es":"El mayor score público del mes se lleva la corona."}'::jsonb,
    '{"min_visibility":"public","scoring":"best_score"}'::jsonb,
    300,
    date_trunc('month', now()),
    (date_trunc('month', now()) + interval '1 month' - interval '1 second')
  ),
  (
    'community',
    'active',
    '{"pt-BR":"Meta da Comunidade","en":"Community Goal","es":"Meta de la Comunidad"}'::jsonb,
    '{"pt-BR":"Juntos vamos chegar a 100 medições públicas.","en":"Together hit 100 public measurements.","es":"Juntos lleguemos a 100 mediciones públicas."}'::jsonb,
    '{"target_public_posts":100}'::jsonb,
    80,
    now() - interval '2 days',
    now() + interval '12 days'
  ),
  (
    'tier_hunt',
    'active',
    '{"pt-BR":"Caça à Épica","en":"Hunt for Epic","es":"Caza de Épica"}'::jsonb,
    '{"pt-BR":"Publique uma leitura Épica ou superior.","en":"Post an Epic or higher reading.","es":"Publica una lectura Épica o superior."}'::jsonb,
    '{"min_tier":"epica","min_visibility":"public"}'::jsonb,
    150,
    now(),
    now() + interval '10 days'
  ),
  (
    'streak',
    'active',
    '{"pt-BR":"Streak de 5 dias","en":"5-day streak","es":"Racha de 5 días"}'::jsonb,
    '{"pt-BR":"Meça em 5 dias seguidos.","en":"Measure on 5 consecutive days.","es":"Mide 5 días seguidos."}'::jsonb,
    '{"target_streak":5}'::jsonb,
    100,
    now(),
    now() + interval '14 days'
  );
