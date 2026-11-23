-- Album vidéo familial privé. À appliquer dans Supabase après les migrations existantes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-videos', 'family-videos', false, 52428800,
  array['video/mp4','video/webm','video/quicktime','video/ogg'])
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.video_album (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default now(),
  constraint video_album_owner_path check (storage_path like user_id::text || '/%')
);

create index if not exists video_album_owner_created_idx
  on public.video_album (user_id, created_at desc);

alter table public.video_album enable row level security;
drop policy if exists "video album owner access" on public.video_album;
create policy "video album owner access" on public.video_album
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.video_album from anon;
grant select, insert, delete on public.video_album to authenticated;

drop policy if exists "family videos owner read" on storage.objects;
create policy "family videos owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'family-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "family videos owner upload" on storage.objects;
create policy "family videos owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'family-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "family videos owner delete" on storage.objects;
create policy "family videos owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'family-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
