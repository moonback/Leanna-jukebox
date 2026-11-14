-- Leanna Jukebox : stockage cloud (une bibliothèque par compte parent).
-- À exécuter dans Supabase > SQL Editor (ou via `supabase db push`).
-- Toutes les tables sont protégées par RLS : chaque compte ne voit que ses propres lignes.
-- Les timestamps sont des millisecondes epoch (bigint), comme dans l'appli.

create table if not exists public.categories (
  user_id      uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  id           text   not null,
  title        text   not null check (char_length(title) between 1 and 60),
  illustration text   not null,
  sort_order   integer not null default 0,
  primary key (user_id, id)
);

create table if not exists public.songs (
  user_id          uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  id               text   not null,
  title            text   not null check (char_length(title) between 1 and 80),
  youtube_video_id text   not null default '',
  category_id      text   not null,
  illustration     text   not null,
  favorite         boolean not null default false,
  sort_order       integer not null default 0,
  created_at       bigint not null,
  updated_at       bigint not null,
  last_played_at   bigint,
  is_demo          boolean not null default false,
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on update cascade
);

create table if not exists public.playlists (
  user_id      uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  id           text   not null,
  title        text   not null check (char_length(title) between 1 and 60),
  illustration text   not null,
  sort_order   integer not null default 0,
  created_at   bigint not null,
  primary key (user_id, id)
);

create table if not exists public.playlist_songs (
  user_id     uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  playlist_id text   not null,
  song_id     text   not null,
  position    integer not null,
  primary key (user_id, playlist_id, song_id),
  foreign key (user_id, playlist_id) references public.playlists (user_id, id) on delete cascade,
  foreign key (user_id, song_id)     references public.songs (user_id, id)     on delete cascade
);

-- Réglages parents. Les compteurs propres à l'appareil (tentatives de PIN, verrouillage) restent en local.
create table if not exists public.settings (
  user_id              uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  pin_hash             text,
  pin_salt             text,
  pin_iterations       integer,
  max_session_minutes  integer not null default 0,
  max_volume_preference integer not null default 80 check (max_volume_preference between 0 and 100),
  child_mode           boolean not null default false,
  sounds_enabled       boolean not null default false,
  fullscreen_mode      boolean not null default false,
  schema_version       integer not null default 1
);

create index if not exists songs_category_idx       on public.songs (user_id, category_id);
create index if not exists playlist_songs_song_idx  on public.playlist_songs (user_id, song_id);

-- Row Level Security : accès réservé au propriétaire des lignes.
alter table public.categories     enable row level security;
alter table public.songs          enable row level security;
alter table public.playlists      enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.settings       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories', 'songs', 'playlists', 'playlist_songs', 'settings']
  loop
    execute format('drop policy if exists "owner full access" on public.%I', t);
    execute format(
      'create policy "owner full access" on public.%I for all to authenticated '
      'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Aucun accès pour le rôle anonyme.
revoke all on public.categories, public.songs, public.playlists, public.playlist_songs, public.settings from anon;
grant select, insert, update, delete on public.categories, public.songs, public.playlists,
  public.playlist_songs, public.settings to authenticated;
