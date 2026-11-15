-- Leanna Jukebox: family cloud sync schema
-- Apply with Supabase SQL Editor or: supabase db push.
-- PIN credentials are intentionally device-local and are not stored in the cloud.

create table if not exists public.categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  illustration text not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  youtube_video_id text not null default '',
  category_id text not null,
  illustration text not null,
  favorite boolean not null default false,
  sort_order integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null,
  last_played_at bigint,
  is_demo boolean not null default false,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint songs_category_fk foreign key (user_id, category_id)
    references public.categories(user_id, id) on delete restrict
);

create table if not exists public.playlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  illustration text not null,
  sort_order integer not null default 0,
  created_at bigint not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.playlist_songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  playlist_id text not null,
  song_id text not null,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, playlist_id, song_id),
  constraint playlist_songs_playlist_fk foreign key (user_id, playlist_id)
    references public.playlists(user_id, id) on delete cascade,
  constraint playlist_songs_song_fk foreign key (user_id, song_id)
    references public.songs(user_id, id) on delete cascade
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_session_minutes integer not null default 0,
  max_volume_preference integer not null default 80,
  child_mode boolean not null default false,
  sounds_enabled boolean not null default false,
  fullscreen_mode boolean not null default false,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','songs','playlists','playlist_songs','settings'] loop
    execute format('drop policy if exists "Users manage own %1$s" on public.%1$I', t);
    execute format(
      'create policy "Users manage own %1$s" on public.%1$I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;

create index if not exists songs_user_sort_idx on public.songs(user_id, sort_order);
create index if not exists playlists_user_sort_idx on public.playlists(user_id, sort_order);
create index if not exists categories_user_sort_idx on public.categories(user_id, sort_order);

-- Realtime requires full replica identity for DELETE payloads.
alter table public.categories replica identity full;
alter table public.songs replica identity full;
alter table public.playlists replica identity full;
alter table public.playlist_songs replica identity full;
alter table public.settings replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then alter publication supabase_realtime add table public.categories; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'songs'
  ) then alter publication supabase_realtime add table public.songs; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'playlists'
  ) then alter publication supabase_realtime add table public.playlists; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'playlist_songs'
  ) then alter publication supabase_realtime add table public.playlist_songs; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings'
  ) then alter publication supabase_realtime add table public.settings; end if;
end $$;
