import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { db as defaultDb, type JukeboxDatabase } from '../database';
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup, restoreBackup } from '../backup';
import { defaultSettings } from '../seed';
import { getSettings } from '../settingsRepository';
import type { Song } from '../../types/song';
import type { Playlist } from '../../types/playlist';
import type { Category } from '../../types/category';
import type { ParentSettings } from '../../types/settings';
import { supabase } from './supabaseClient';

export type SyncState = 'idle' | 'syncing' | 'error';
export interface SyncStatus {
  state: SyncState;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
  realtime: 'connected' | 'connecting' | 'disconnected';
}

const DEBOUNCE_MS = 1200;
const REMOTE_DEBOUNCE_MS = 350;
const CHUNK = 200;
const PAGE = 1000;
const OWNER_KEY = 'leanna-cloud-owner';
const DEVICE_ONLY_SETTINGS = new Set(['failedAttempts', 'lockedUntil']);

let status: SyncStatus = { state: 'idle', userId: null, lastSyncedAt: null, error: null, realtime: 'disconnected' };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let remoteTimer: ReturnType<typeof setTimeout> | undefined;
let channel: RealtimeChannel | null = null;
let running = false;
let rerun = false;
let applyingRemote = false;
let hooksInstalled = false;
let changeCounter = 0;
let activeDb: JukeboxDatabase = defaultDb;

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener());
}
export const getSyncStatus = (): SyncStatus => status;
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const dirtyKey = (userId: string) => `leanna-cloud-dirty:${userId}`;
const isDirty = (userId: string) => localStorage.getItem(dirtyKey(userId)) === '1';
const setDirty = (userId: string, value: boolean) => {
  if (value) localStorage.setItem(dirtyKey(userId), '1');
  else localStorage.removeItem(dirtyKey(userId));
};
function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Synchronisation impossible.';
}
function must<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
async function fetchAll<T>(client: SupabaseClient, table: string, columns: string, userId: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = must(await client.from(table).select(columns).eq('user_id', userId).range(from, from + PAGE - 1)) as unknown as T[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}
async function upsertChunks(client: SupabaseClient, table: string, rows: object[], onConflict: string): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) must(await client.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict }));
}
async function deleteMissing(client: SupabaseClient, table: string, userId: string, keep: Set<string>): Promise<void> {
  const remote = await fetchAll<{ id: string }>(client, table, 'id', userId);
  const stale = remote.map((row) => row.id).filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += CHUNK) {
    must(await client.from(table).delete().eq('user_id', userId).in('id', stale.slice(i, i + CHUNK)));
  }
}

export async function pushAll(client: SupabaseClient, userId: string, database: JukeboxDatabase = activeDb): Promise<void> {
  const [categories, songs, playlists, settings] = await Promise.all([
    database.categories.toArray(), database.songs.toArray(), database.playlists.toArray(), getSettings(database),
  ]);
  const songIds = new Set(songs.map((song) => song.id));
  await upsertChunks(client, 'categories', categories.map((category) => ({
    user_id: userId, id: category.id, title: category.title, illustration: category.illustration, sort_order: category.sortOrder,
  })), 'user_id,id');
  await upsertChunks(client, 'songs', songs.map((song) => ({
    user_id: userId, id: song.id, title: song.title, youtube_video_id: song.youtubeVideoId, category_id: song.categoryId,
    illustration: song.illustration, favorite: song.favorite, sort_order: song.sortOrder, created_at: song.createdAt,
    updated_at: song.updatedAt, last_played_at: song.lastPlayedAt ?? null, is_demo: song.isDemo === true,
  })), 'user_id,id');
  await upsertChunks(client, 'playlists', playlists.map((playlist) => ({
    user_id: userId, id: playlist.id, title: playlist.title, illustration: playlist.illustration,
    sort_order: playlist.sortOrder, created_at: playlist.createdAt,
  })), 'user_id,id');

  const links = playlists.flatMap((playlist) =>
    playlist.songIds.filter((songId) => songIds.has(songId)).map((songId, position) => ({
      user_id: userId, playlist_id: playlist.id, song_id: songId, position,
    })),
  );
  const remoteLinks = await fetchAll<{ playlist_id: string; song_id: string }>(client, 'playlist_songs', 'playlist_id,song_id', userId);
  const keepLinks = new Set(links.map((link) => `${link.playlist_id}|${link.song_id}`));
  for (const link of remoteLinks) {
    if (!keepLinks.has(`${link.playlist_id}|${link.song_id}`)) {
      must(await client.from('playlist_songs').delete().eq('user_id', userId).eq('playlist_id', link.playlist_id).eq('song_id', link.song_id));
    }
  }
  await upsertChunks(client, 'playlist_songs', links, 'user_id,playlist_id,song_id');

  // PIN credentials and failed-attempt counters stay on-device by design.
  must(await client.from('settings').upsert({
    user_id: userId, max_session_minutes: settings.maxSessionMinutes,
    max_volume_preference: settings.maxVolumePreference, child_mode: settings.childMode,
    sounds_enabled: settings.soundsEnabled, fullscreen_mode: settings.fullscreenMode,
    schema_version: settings.schemaVersion,
  }, { onConflict: 'user_id' }));

  await deleteMissing(client, 'playlists', userId, new Set(playlists.map((playlist) => playlist.id)));
  await deleteMissing(client, 'songs', userId, songIds);
  await deleteMissing(client, 'categories', userId, new Set(categories.map((category) => category.id)));
}

interface SongRow {
  id: string; title: string; youtube_video_id: string; category_id: string; illustration: string; favorite: boolean;
  sort_order: number; created_at: number; updated_at: number; last_played_at: number | null; is_demo: boolean;
}
interface CategoryRow { id: string; title: string; illustration: string; sort_order: number }
interface PlaylistRow { id: string; title: string; illustration: string; sort_order: number; created_at: number }
interface LinkRow { playlist_id: string; song_id: string; position: number }
interface SettingsRow {
  max_session_minutes: number; max_volume_preference: number; child_mode: boolean;
  sounds_enabled: boolean; fullscreen_mode: boolean; schema_version: number;
}
async function isRemoteEmpty(client: SupabaseClient, userId: string): Promise<boolean> {
  const { count, error } = await client.from('categories').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) === 0;
}

export async function pullAll(client: SupabaseClient, userId: string, database: JukeboxDatabase = activeDb): Promise<void> {
  const [categories, songs, playlists, links, settingsRows] = await Promise.all([
    fetchAll<CategoryRow>(client, 'categories', '*', userId),
    fetchAll<SongRow>(client, 'songs', '*', userId),
    fetchAll<PlaylistRow>(client, 'playlists', '*', userId),
    fetchAll<LinkRow>(client, 'playlist_songs', 'playlist_id,song_id,position', userId),
    fetchAll<SettingsRow>(client, 'settings', '*', userId),
  ]);
  if (categories.length === 0) throw new Error('La bibliothèque cloud est vide. Les données locales ont été conservées.');
  const byPlaylist = new Map<string, LinkRow[]>();
  for (const link of links) byPlaylist.set(link.playlist_id, [...(byPlaylist.get(link.playlist_id) ?? []), link]);
  const data = parseBackup({
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
    categories: categories.map((category): Category => ({
      id: category.id, title: category.title, illustration: category.illustration as Category['illustration'], sortOrder: category.sort_order,
    })),
    songs: songs.map((song): Song => ({
      id: song.id, title: song.title, youtubeVideoId: song.youtube_video_id, categoryId: song.category_id,
      illustration: song.illustration as Song['illustration'], favorite: song.favorite, sortOrder: song.sort_order,
      createdAt: Number(song.created_at), updatedAt: Number(song.updated_at),
      ...(song.last_played_at !== null ? { lastPlayedAt: Number(song.last_played_at) } : {}),
      ...(song.is_demo ? { isDemo: true } : {}),
    })),
    playlists: playlists.map((playlist): Playlist => ({
      id: playlist.id, title: playlist.title, illustration: playlist.illustration as Playlist['illustration'],
      songIds: (byPlaylist.get(playlist.id) ?? []).sort((a, b) => a.position - b.position).map((link) => link.song_id),
      sortOrder: playlist.sort_order, createdAt: Number(playlist.created_at),
    })),
  });
  applyingRemote = true;
  try {
    await restoreBackup(data, database);
    const remote = settingsRows[0];
    if (remote) {
      const current = await getSettings(database);
      const next: ParentSettings = {
        ...current, key: 'parent', maxSessionMinutes: remote.max_session_minutes,
        maxVolumePreference: remote.max_volume_preference, childMode: remote.child_mode,
        soundsEnabled: remote.sounds_enabled, fullscreenMode: remote.fullscreen_mode,
        schemaVersion: remote.schema_version ?? defaultSettings().schemaVersion,
      };
      // Never import or export a PIN hash. Keep the PIN configured on this physical device.
      await database.settings.put(next);
    }
  } finally {
    applyingRemote = false;
  }
}

async function pullAfterRemoteChange(): Promise<void> {
  const client = supabase;
  const userId = status.userId;
  if (!client || !userId || !navigator.onLine) return;
  if (isDirty(userId)) {
    scheduleFlush();
    return;
  }
  setStatus({ state: 'syncing', error: null });
  try {
    await pullAll(client, userId);
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error) });
  }
}
function scheduleRemotePull(): void {
  clearTimeout(remoteTimer);
  remoteTimer = setTimeout(() => void pullAfterRemoteChange(), REMOTE_DEBOUNCE_MS);
}
function connectRealtime(client: SupabaseClient, userId: string): void {
  if (channel) void client.removeChannel(channel);
  setStatus({ realtime: 'connecting' });
  channel = client.channel(`jukebox-family-${userId}`);
  for (const table of ['categories', 'songs', 'playlists', 'playlist_songs', 'settings']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, () => {
      scheduleRemotePull();
    });
  }
  channel.subscribe((state) => {
    if (state === 'SUBSCRIBED') {
      setStatus({ realtime: 'connected' });
      // Reconcile events missed while this device was disconnected.
      scheduleRemotePull();
    } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
      setStatus({ realtime: 'disconnected' });
    }
  });
}

async function flush(): Promise<void> {
  const client = supabase;
  const userId = status.userId;
  if (!client || !userId || !navigator.onLine) return;
  if (running) { rerun = true; return; }
  running = true;
  const startedAt = changeCounter;
  setStatus({ state: 'syncing', error: null });
  try {
    await pushAll(client, userId);
    if (changeCounter === startedAt) setDirty(userId, false);
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error) });
  } finally {
    running = false;
    if (rerun) { rerun = false; scheduleFlush(); }
  }
}
function scheduleFlush(): void {
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), DEBOUNCE_MS);
}
function markChanged(): void {
  const userId = status.userId;
  if (applyingRemote || !userId) return;
  changeCounter += 1;
  setDirty(userId, true);
  scheduleFlush();
}
function installHooks(database: JukeboxDatabase): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const table of [database.songs, database.playlists, database.categories]) {
    table.hook('creating', () => { markChanged(); });
    table.hook('updating', () => { markChanged(); });
    table.hook('deleting', () => { markChanged(); });
  }
  database.settings.hook('creating', () => { markChanged(); });
  database.settings.hook('deleting', () => { markChanged(); });
  database.settings.hook('updating', (modifications) => {
    if (Object.keys(modifications).some((key) => !DEVICE_ONLY_SETTINGS.has(key))) markChanged();
  });
  window.addEventListener('online', () => {
    const userId = status.userId;
    if (userId && isDirty(userId)) scheduleFlush();
    else if (userId) scheduleRemotePull();
  });
}

export async function startSync(userId: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  const client = supabase;
  if (!client) return;
  activeDb = database;
  installHooks(database);
  clearTimeout(timer);
  setStatus({ state: 'syncing', userId, error: null, realtime: 'connecting' });
  try {
    const previousOwner = localStorage.getItem(OWNER_KEY);
    const remoteEmpty = await isRemoteEmpty(client, userId);
    if (previousOwner && previousOwner !== userId) {
      // A device switching family accounts must never upload the previous family's local cache.
      if (remoteEmpty) throw new Error('Ce compte est différent du précédent et ne contient pas encore de bibliothèque. Déconnecte-toi de cet appareil ou importe une sauvegarde explicitement.');
      await pullAll(client, userId, database);
    } else if (isDirty(userId) || remoteEmpty) {
      await pushAll(client, userId, database);
      setDirty(userId, false);
    } else {
      await pullAll(client, userId, database);
    }
    localStorage.setItem(OWNER_KEY, userId);
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
    connectRealtime(client, userId);
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error), realtime: 'disconnected' });
  }
}
export function stopSync(): void {
  clearTimeout(timer);
  clearTimeout(remoteTimer);
  if (channel && supabase) void supabase.removeChannel(channel);
  channel = null;
  running = false;
  rerun = false;
  setStatus({ state: 'idle', userId: null, lastSyncedAt: null, error: null, realtime: 'disconnected' });
}
export async function syncNow(): Promise<void> {
  clearTimeout(timer);
  await flush();
}
export async function restoreFromCloud(): Promise<void> {
  const client = supabase;
  const userId = status.userId;
  if (!client || !userId) return;
  setStatus({ state: 'syncing', error: null });
  try {
    await pullAll(client, userId);
    setDirty(userId, false);
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error) });
    throw error;
  }
}
