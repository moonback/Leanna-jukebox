-- Album photo familial privé. À appliquer après les migrations existantes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.photo_album (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default now(),
  constraint photo_album_owner_path check (storage_path like user_id::text || '/%')
);

create index if not exists photo_album_owner_created_idx
  on public.photo_album (user_id, created_at desc);

alter table public.photo_album enable row level security;
drop policy if exists "photo album owner access" on public.photo_album;
create policy "photo album owner access" on public.photo_album
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.photo_album from anon;
grant select, insert, delete on public.photo_album to authenticated;

drop policy if exists "family photos owner read" on storage.objects;
create policy "family photos owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'family-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "family photos owner upload" on storage.objects;
create policy "family photos owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'family-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "family photos owner delete" on storage.objects;
create policy "family photos owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'family-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
