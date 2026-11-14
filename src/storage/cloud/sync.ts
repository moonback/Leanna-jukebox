import type { SupabaseClient } from '@supabase/supabase-js';
import { db as defaultDb, type JukeboxDatabase } from '../database';
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup, restoreBackup } from '../backup';
import { defaultSettings } from '../seed';
import { getSettings } from '../settingsRepository';
import type { Song } from '../../types/song';
import type { Playlist } from '../../types/playlist';
import type { Category } from '../../types/category';
import type { ParentSettings } from '../../types/settings';
import { supabase } from './supabaseClient';

/**
 * Synchronisation Supabase. Dexie reste le cache local (rapide, hors ligne) ; Supabase est la copie de référence.
 * Stratégie : à chaque modification locale, un instantané complet est envoyé (anti-rebond). Au démarrage,
 * si rien n'est en attente d'envoi, la copie distante remplace la copie locale (dernier écrivain gagnant).
 * Les compteurs de PIN (`failedAttempts`, `lockedUntil`) restent propres à l'appareil.
 */

export type SyncState = 'idle' | 'syncing' | 'error';
export interface SyncStatus {
  state: SyncState;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
}

const DIRTY_KEY = 'leanna-cloud-dirty';
const DEBOUNCE_MS = 1500;
const CHUNK = 200;
const PAGE = 1000;
const DEVICE_ONLY_SETTINGS = new Set(['failedAttempts', 'lockedUntil']);

let status: SyncStatus = { state: 'idle', userId: null, lastSyncedAt: null, error: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let rerun = false;
let applyingRemote = false;
let hooksInstalled = false;
let changeCounter = 0;
let activeDb: JukeboxDatabase = defaultDb;

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export const getSyncStatus = (): SyncStatus => status;
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const isDirty = (): boolean => localStorage.getItem(DIRTY_KEY) === '1';
const setDirty = (value: boolean): void => {
  if (value) localStorage.setItem(DIRTY_KEY, '1');
  else localStorage.removeItem(DIRTY_KEY);
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
    const page = must(
      await client.from(table).select(columns).eq('user_id', userId).order('user_id').range(from, from + PAGE - 1),
    ) as unknown as T[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function upsertChunks(client: SupabaseClient, table: string, rows: object[], onConflict: string): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    must(await client.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict }));
  }
}

async function deleteMissing(
  client: SupabaseClient,
  table: string,
  userId: string,
  keep: Set<string>,
): Promise<void> {
  const remote = await fetchAll<{ id: string }>(client, table, 'id', userId);
  const stale = remote.map((r) => r.id).filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += CHUNK) {
    must(await client.from(table).delete().eq('user_id', userId).in('id', stale.slice(i, i + CHUNK)));
  }
}

/** Envoie l'état local complet vers Supabase. */
export async function pushAll(client: SupabaseClient, userId: string, database: JukeboxDatabase = activeDb): Promise<void> {
  const [categories, songs, playlists, settings] = await Promise.all([
    database.categories.toArray(),
    database.songs.toArray(),
    database.playlists.toArray(),
    getSettings(database),
  ]);
  const songIds = new Set(songs.map((s) => s.id));

  await upsertChunks(client, 'categories', categories.map((c) => ({
    user_id: userId, id: c.id, title: c.title, illustration: c.illustration, sort_order: c.sortOrder,
  })), 'user_id,id');
  await upsertChunks(client, 'songs', songs.map((s) => ({
    user_id: userId, id: s.id, title: s.title, youtube_video_id: s.youtubeVideoId, category_id: s.categoryId,
    illustration: s.illustration, favorite: s.favorite, sort_order: s.sortOrder, created_at: s.createdAt,
    updated_at: s.updatedAt, last_played_at: s.lastPlayedAt ?? null, is_demo: s.isDemo === true,
  })), 'user_id,id');
  await upsertChunks(client, 'playlists', playlists.map((p) => ({
    user_id: userId, id: p.id, title: p.title, illustration: p.illustration, sort_order: p.sortOrder, created_at: p.createdAt,
  })), 'user_id,id');

  // Liens playlist ↔ chanson : on remplace ceux des playlists locales, puis on retire les orphelins.
  const links = playlists.flatMap((p) =>
    p.songIds.filter((id) => songIds.has(id)).map((songId, position) => ({
      user_id: userId, playlist_id: p.id, song_id: songId, position,
    })),
  );
  const remoteLinks = await fetchAll<{ playlist_id: string; song_id: string }>(client, 'playlist_songs', 'playlist_id,song_id', userId);
  const keepLinks = new Set(links.map((l) => `${l.playlist_id}|${l.song_id}`));
  for (const link of remoteLinks) {
    if (keepLinks.has(`${link.playlist_id}|${link.song_id}`)) continue;
    must(await client.from('playlist_songs').delete().eq('user_id', userId).eq('playlist_id', link.playlist_id).eq('song_id', link.song_id));
  }
  await upsertChunks(client, 'playlist_songs', links, 'user_id,playlist_id,song_id');

  must(await client.from('settings').upsert({
    user_id: userId,
    pin_hash: settings.pinHash ?? null,
    pin_salt: settings.pinSalt ?? null,
    pin_iterations: settings.pinIterations ?? null,
    max_session_minutes: settings.maxSessionMinutes,
    max_volume_preference: settings.maxVolumePreference,
    child_mode: settings.childMode,
    sounds_enabled: settings.soundsEnabled,
    fullscreen_mode: settings.fullscreenMode,
    schema_version: settings.schemaVersion,
  }, { onConflict: 'user_id' }));

  // Suppressions : playlists et chansons avant les catégories (clé étrangère).
  await deleteMissing(client, 'playlists', userId, new Set(playlists.map((p) => p.id)));
  await deleteMissing(client, 'songs', userId, songIds);
  await deleteMissing(client, 'categories', userId, new Set(categories.map((c) => c.id)));
}

interface SongRow {
  id: string; title: string; youtube_video_id: string; category_id: string; illustration: string; favorite: boolean;
  sort_order: number; created_at: number; updated_at: number; last_played_at: number | null; is_demo: boolean;
}
interface CategoryRow { id: string; title: string; illustration: string; sort_order: number }
interface PlaylistRow { id: string; title: string; illustration: string; sort_order: number; created_at: number }
interface LinkRow { playlist_id: string; song_id: string; position: number }
interface SettingsRow {
  pin_hash: string | null; pin_salt: string | null; pin_iterations: number | null; max_session_minutes: number;
  max_volume_preference: number; child_mode: boolean; sounds_enabled: boolean; fullscreen_mode: boolean; schema_version: number;
}

/** Vrai si le compte n'a encore aucune donnée dans Supabase. */
async function isRemoteEmpty(client: SupabaseClient, userId: string): Promise<boolean> {
  const { count, error } = await client.from('categories').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) === 0;
}

/** Remplace l'état local par celui de Supabase. Les données distantes sont validées comme une sauvegarde importée. */
export async function pullAll(client: SupabaseClient, userId: string, database: JukeboxDatabase = activeDb): Promise<void> {
  const [categories, songs, playlists, links, settingsRows] = await Promise.all([
    fetchAll<CategoryRow>(client, 'categories', '*', userId),
    fetchAll<SongRow>(client, 'songs', '*', userId),
    fetchAll<PlaylistRow>(client, 'playlists', '*', userId),
    fetchAll<LinkRow>(client, 'playlist_songs', 'playlist_id,song_id,position', userId),
    fetchAll<SettingsRow>(client, 'settings', '*', userId),
  ]);

  const byPlaylist = new Map<string, LinkRow[]>();
  for (const link of links) byPlaylist.set(link.playlist_id, [...(byPlaylist.get(link.playlist_id) ?? []), link]);

  const data = parseBackup({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories: categories.map((c): Category => ({
      id: c.id, title: c.title, illustration: c.illustration as Category['illustration'], sortOrder: c.sort_order,
    })),
    songs: songs.map((s): Song => ({
      id: s.id,
      title: s.title,
      youtubeVideoId: s.youtube_video_id,
      categoryId: s.category_id,
      illustration: s.illustration as Song['illustration'],
      favorite: s.favorite,
      sortOrder: s.sort_order,
      createdAt: Number(s.created_at),
      updatedAt: Number(s.updated_at),
      ...(s.last_played_at !== null ? { lastPlayedAt: Number(s.last_played_at) } : {}),
      ...(s.is_demo ? { isDemo: true } : {}),
    })),
    playlists: playlists.map((p): Playlist => ({
      id: p.id,
      title: p.title,
      illustration: p.illustration as Playlist['illustration'],
      songIds: (byPlaylist.get(p.id) ?? []).sort((a, b) => a.position - b.position).map((l) => l.song_id),
      sortOrder: p.sort_order,
      createdAt: Number(p.created_at),
    })),
  });

  applyingRemote = true;
  try {
    await restoreBackup(data, database);
    const remote = settingsRows[0];
    if (remote) {
      const base = defaultSettings();
      const patch: Partial<Omit<ParentSettings, 'key'>> = {
        maxSessionMinutes: remote.max_session_minutes,
        maxVolumePreference: remote.max_volume_preference,
        childMode: remote.child_mode,
        soundsEnabled: remote.sounds_enabled,
        fullscreenMode: remote.fullscreen_mode,
        schemaVersion: remote.schema_version ?? base.schemaVersion,
      };
      const current = await getSettings(database);
      const next: ParentSettings = { ...current, ...patch, key: 'parent' };
      if (remote.pin_hash && remote.pin_salt) {
        next.pinHash = remote.pin_hash;
        next.pinSalt = remote.pin_salt;
        if (remote.pin_iterations) next.pinIterations = remote.pin_iterations;
        else delete next.pinIterations;
      } else {
        delete next.pinHash;
        delete next.pinSalt;
        delete next.pinIterations;
      }
      await database.settings.put(next);
    }
  } finally {
    applyingRemote = false;
  }
}

async function flush(): Promise<void> {
  const client = supabase;
  const userId = status.userId;
  if (!client || !userId) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  const startedAt = changeCounter;
  setStatus({ state: 'syncing', error: null });
  try {
    await pushAll(client, userId);
    if (changeCounter === startedAt) setDirty(false);
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error) });
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      scheduleFlush();
    }
  }
}

function scheduleFlush(): void {
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), DEBOUNCE_MS);
}

function markChanged(): void {
  if (applyingRemote || !status.userId) return;
  changeCounter += 1;
  setDirty(true);
  scheduleFlush();
}

function installHooks(database: JukeboxDatabase): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  for (const table of [database.songs, database.playlists, database.categories]) {
    table.hook('creating', () => void markChanged());
    table.hook('updating', () => void markChanged());
    table.hook('deleting', () => void markChanged());
  }
  database.settings.hook('creating', () => void markChanged());
  database.settings.hook('deleting', () => void markChanged());
  database.settings.hook('updating', (modifications) => {
    if (Object.keys(modifications).some((key) => !DEVICE_ONLY_SETTINGS.has(key))) markChanged();
  });
  window.addEventListener('online', () => {
    if (status.userId && isDirty()) scheduleFlush();
  });
}

/**
 * Démarre la synchronisation pour un compte connecté.
 * Modifications en attente → envoi d'abord. Compte vide → envoi de la bibliothèque locale. Sinon → récupération.
 */
export async function startSync(userId: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  const client = supabase;
  if (!client) return;
  activeDb = database;
  installHooks(database);
  setStatus({ state: 'syncing', userId, error: null });
  try {
    if (isDirty() || (await isRemoteEmpty(client, userId))) {
      await pushAll(client, userId, database);
      setDirty(false);
    } else {
      await pullAll(client, userId, database);
    }
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (error) {
    // Hors ligne ou erreur réseau : on garde les données locales, un nouvel essai aura lieu au prochain changement.
    setStatus({ state: 'error', error: messageOf(error) });
  }
}

export function stopSync(): void {
  clearTimeout(timer);
  setStatus({ state: 'idle', userId: null, lastSyncedAt: null, error: null });
}

/** Force une synchronisation immédiate (envoi de l'état local). */
export async function syncNow(): Promise<void> {
  clearTimeout(timer);
  await flush();
}

/** Remplace l'état local par la copie Supabase (action explicite du parent). */
export async function restoreFromCloud(): Promise<void> {
  const client = supabase;
  const userId = status.userId;
  if (!client || !userId) return;
  setStatus({ state: 'syncing', error: null });
  try {
    await pullAll(client, userId);
    setDirty(false);
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error) });
    throw error;
  }
}
