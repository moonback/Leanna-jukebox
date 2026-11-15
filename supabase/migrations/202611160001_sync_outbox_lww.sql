-- Leanna Jukebox — journal de synchronisation familial, tombstones et fusion LWW.
-- À appliquer après 202611150001_family_realtime_sync.sql.
-- Le serveur attribue l'horodatage de fusion : l'ordre d'arrivée au serveur fait foi
-- pour chaque champ, et les opérations rejouées sont idempotentes.

create table if not exists public.sync_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('category','song','playlist','settings','sticker','game_progress')),
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  field_versions jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  device_id text not null default 'unknown',
  primary key (user_id, entity_type, entity_id)
);

create index if not exists sync_records_user_updated_idx
  on public.sync_records(user_id, server_updated_at desc);
create index if not exists sync_records_user_entity_active_idx
  on public.sync_records(user_id, entity_type) where deleted_at is null;

create table if not exists public.sync_operation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  applied_at timestamptz not null default clock_timestamp(),
  primary key (user_id, operation_id)
);

alter table public.sync_records enable row level security;
alter table public.sync_operation_receipts enable row level security;
drop policy if exists "Users manage own sync records" on public.sync_records;
create policy "Users manage own sync records" on public.sync_records
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users read own sync receipts" on public.sync_operation_receipts;
create policy "Users read own sync receipts" on public.sync_operation_receipts
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own sync receipts" on public.sync_operation_receipts;
create policy "Users create own sync receipts" on public.sync_operation_receipts
  for insert to authenticated with check (auth.uid() = user_id);
revoke all on public.sync_records, public.sync_operation_receipts from anon;
grant select, insert, update, delete on public.sync_records to authenticated;
grant select, insert on public.sync_operation_receipts to authenticated;

create or replace function public.merge_sync_record(
  p_operation_id uuid,
  p_entity_type text,
  p_entity_id text,
  p_operation text,
  p_patch jsonb,
  p_device_id text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_versions jsonb := '{}'::jsonb;
  v_result jsonb;
  v_key text;
  v_claimed uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_entity_type not in ('category','song','playlist','settings','sticker','game_progress') then
    raise exception 'Unsupported sync entity';
  end if;
  if p_operation not in ('upsert','delete') then
    raise exception 'Unsupported sync operation';
  end if;
  if p_entity_id is null or length(p_entity_id) = 0 or length(p_entity_id) > 160 then
    raise exception 'Invalid sync entity id';
  end if;

  insert into public.sync_operation_receipts(user_id, operation_id, entity_type, entity_id)
  values (v_user_id, p_operation_id, p_entity_type, p_entity_id)
  on conflict (user_id, operation_id) do nothing
  returning operation_id into v_claimed;

  if v_claimed is null then
    select to_jsonb(r) into v_result
    from public.sync_records r
    where r.user_id = v_user_id and r.entity_type = p_entity_type and r.entity_id = p_entity_id;
    return v_result;
  end if;

  if p_operation = 'upsert' then
    for v_key in select jsonb_object_keys(coalesce(p_patch, '{}'::jsonb))
    loop
      v_versions := v_versions || jsonb_build_object(v_key, v_now);
    end loop;
  else
    v_versions := jsonb_build_object('__deleted', v_now);
  end if;

  insert into public.sync_records(
    user_id, entity_type, entity_id, payload, field_versions, deleted_at, server_updated_at, device_id
  ) values (
    v_user_id, p_entity_type, p_entity_id,
    case when p_operation = 'upsert' then coalesce(p_patch, '{}'::jsonb) else '{}'::jsonb end,
    v_versions,
    case when p_operation = 'delete' then v_now else null end,
    v_now,
    coalesce(nullif(p_device_id, ''), 'unknown')
  )
  on conflict (user_id, entity_type, entity_id) do update set
    payload = case when p_operation = 'delete' then sync_records.payload
                   else sync_records.payload || coalesce(p_patch, '{}'::jsonb) end,
    field_versions = sync_records.field_versions || v_versions,
    deleted_at = case when p_operation = 'delete' then v_now else null end,
    server_updated_at = v_now,
    device_id = coalesce(nullif(p_device_id, ''), 'unknown')
  returning to_jsonb(sync_records) into v_result;

  return v_result;
end;
$$;

revoke all on function public.merge_sync_record(uuid,text,text,text,jsonb,text) from public;
grant execute on function public.merge_sync_record(uuid,text,text,text,jsonb,text) to authenticated;

-- Reprise des bibliothèques déjà synchronisées avec le schéma historique.
insert into public.sync_records(user_id, entity_type, entity_id, payload, server_updated_at, device_id)
select c.user_id, 'category', c.id,
  jsonb_build_object('id',c.id,'title',c.title,'illustration',c.illustration,'sortOrder',c.sort_order),
  clock_timestamp(), 'migration'
from public.categories c
on conflict (user_id,entity_type,entity_id) do nothing;

insert into public.sync_records(user_id, entity_type, entity_id, payload, server_updated_at, device_id)
select s.user_id, 'song', s.id,
  jsonb_build_object('id',s.id,'title',s.title,'youtubeVideoId',s.youtube_video_id,'categoryId',s.category_id,
    'illustration',s.illustration,'favorite',s.favorite,'sortOrder',s.sort_order,'createdAt',s.created_at,
    'updatedAt',s.updated_at,'lastPlayedAt',s.last_played_at,'isDemo',s.is_demo),
  clock_timestamp(), 'migration'
from public.songs s
on conflict (user_id,entity_type,entity_id) do nothing;

insert into public.sync_records(user_id, entity_type, entity_id, payload, server_updated_at, device_id)
select p.user_id, 'playlist', p.id,
  jsonb_build_object('id',p.id,'title',p.title,'illustration',p.illustration,'sortOrder',p.sort_order,
    'createdAt',p.created_at,'songIds',coalesce((
      select jsonb_agg(ps.song_id order by ps.position)
      from public.playlist_songs ps where ps.user_id=p.user_id and ps.playlist_id=p.id
    ), '[]'::jsonb)),
  clock_timestamp(), 'migration'
from public.playlists p
on conflict (user_id,entity_type,entity_id) do nothing;

insert into public.sync_records(user_id, entity_type, entity_id, payload, server_updated_at, device_id)
select s.user_id, 'settings', 'parent',
  jsonb_build_object('maxSessionMinutes',s.max_session_minutes,'maxVolumePreference',s.max_volume_preference,
    'childMode',s.child_mode,'soundsEnabled',s.sounds_enabled,'fullscreenMode',s.fullscreen_mode,
    'schemaVersion',s.schema_version),
  clock_timestamp(), 'migration'
from public.settings s
on conflict (user_id,entity_type,entity_id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='sync_records'
  ) then
    alter publication supabase_realtime add table public.sync_records;
  end if;
end $$;
