import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { db as defaultDb, type JukeboxDatabase, type SyncEntityType } from '../database';
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup, restoreBackup } from '../backup';
import { defaultSettings } from '../seed';
import { getSettings } from '../settingsRepository';
import { supabase } from './supabaseClient';

export type SyncState = 'idle' | 'syncing' | 'error';
export interface SyncStatus {
  state: SyncState;
  userId: string | null;
  lastSyncedAt: number | null;
  error: string | null;
  realtime: 'connected' | 'connecting' | 'disconnected';
  confirmationRequired: boolean;
  pendingDeleteCount: number;
}

interface SyncRecord {
  user_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  payload: Record<string, unknown>;
  field_versions: Record<string, string>;
  deleted_at: string | null;
  server_updated_at: string;
  device_id: string;
}

const PAGE = 500;
const REMOTE_DEBOUNCE_MS = 250;
const OWNER_KEY = 'leanna-cloud-owner';
const LEGACY_DIRTY_PREFIX = 'leanna-cloud-dirty:';
const DEVICE_KEY = 'leanna-device-id';

let status: SyncStatus = {
  state: 'idle', userId: null, lastSyncedAt: null, error: null,
  realtime: 'disconnected', confirmationRequired: false, pendingDeleteCount: 0,
};
const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let remoteTimer: ReturnType<typeof setTimeout> | undefined;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushPromise: Promise<void> | null = null;
let rerunRequested = false;
let approvedDeletionSignature = '';
let activeDb: JukeboxDatabase = defaultDb;
let onlineListenerInstalled = false;

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener());
}
export const getSyncStatus = (): SyncStatus => status;
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Synchronisation impossible.';
}
function must<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
async function fetchRecords(client: SupabaseClient, userId: string): Promise<SyncRecord[]> {
  const rows: SyncRecord[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = must(await client.from('sync_records').select('*').eq('user_id', userId)
      .order('server_updated_at', { ascending: true }).range(from, from + PAGE - 1)) as unknown as SyncRecord[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}
async function countRemote(client: SupabaseClient, userId: string, entityType: SyncEntityType): Promise<number> {
  const { count, error } = await client.from('sync_records')
    .select('entity_id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('entity_type', entityType).is('deleted_at', null);
  if (error) throw error;
  return count ?? 0;
}

function safeSettings(settings: Awaited<ReturnType<typeof getSettings>>): Record<string, unknown> {
  return {
    maxSessionMinutes: settings.maxSessionMinutes,
    maxVolumePreference: settings.maxVolumePreference,
    childMode: settings.childMode,
    soundsEnabled: settings.soundsEnabled,
    fullscreenMode: settings.fullscreenMode,
    schemaVersion: settings.schemaVersion,
  };
}

async function queueInitialSnapshot(database: JukeboxDatabase, userId: string): Promise<void> {
  await database.transaction('rw', database.songs, database.playlists, database.categories,
    database.settings, database.stickers, database.gameProgress, database.syncOutbox, async () => {
      const [categories, songs, playlists, settings, stickers, progress] = await Promise.all([
        database.categories.toArray(), database.songs.toArray(), database.playlists.toArray(),
        getSettings(database), database.stickers.toArray(), database.gameProgress.toArray(),
      ]);
      const queue = async (entityType: SyncEntityType, entityId: string, patch: Record<string, unknown>) => {
        await database.syncOutbox.add({
          operationId: globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
            const value = Math.floor(Math.random() * 16);
            return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
          }),
          ownerUserId: userId,
          entityType, entityId, operation: 'upsert', patch, createdAt: Date.now(), attempts: 0,
        });
      };
      for (const row of categories) await queue('category', row.id, { ...row });
      for (const row of songs) await queue('song', row.id, { ...row });
      for (const row of playlists) await queue('playlist', row.id, { ...row });
      await queue('settings', 'parent', safeSettings(settings));
      for (const row of stickers) await queue('sticker', row.id, { ...row });
      for (const row of progress) await queue('game_progress', row.gameId, { ...row });
    });
}

function activePayload(records: SyncRecord[], entityType: SyncEntityType): Record<string, Record<string, unknown>> {
  const output: Record<string, Record<string, unknown>> = {};
  for (const row of records) {
    if (row.entity_type === entityType && !row.deleted_at) output[row.entity_id] = row.payload ?? {};
  }
  return output;
}

async function applyRecord(row: SyncRecord, database: JukeboxDatabase): Promise<void> {
  if (row.deleted_at) {
    if (row.entity_type === 'category') await database.categories.delete(row.entity_id);
    if (row.entity_type === 'song') await database.songs.delete(row.entity_id);
    if (row.entity_type === 'playlist') await database.playlists.delete(row.entity_id);
    if (row.entity_type === 'sticker') await database.stickers.delete(row.entity_id);
    if (row.entity_type === 'game_progress') await database.gameProgress.delete(row.entity_id);
    if (row.entity_type === 'settings') {
      // La suppression des réglages cloud ne supprime jamais le PIN local.
      const current = await getSettings(database);
      await database.settings.put({ ...defaultSettings(), pinHash: current.pinHash, pinSalt: current.pinSalt, pinIterations: current.pinIterations, failedAttempts: current.failedAttempts, lockedUntil: current.lockedUntil });
    }
    return;
  }
  const payload = row.payload ?? {};
  if (row.entity_type === 'category') await database.categories.put(payload as never);
  else if (row.entity_type === 'song') await database.songs.put(payload as never);
  else if (row.entity_type === 'playlist') await database.playlists.put(payload as never);
  else if (row.entity_type === 'sticker') await database.stickers.put(payload as never);
  else if (row.entity_type === 'game_progress') await database.gameProgress.put(payload as never);
  else if (row.entity_type === 'settings') {
    const current = await getSettings(database);
    await database.settings.put({
      ...current,
      key: 'parent',
      maxSessionMinutes: Number(payload.maxSessionMinutes ?? current.maxSessionMinutes),
      maxVolumePreference: Number(payload.maxVolumePreference ?? current.maxVolumePreference),
      childMode: Boolean(payload.childMode ?? current.childMode),
      soundsEnabled: Boolean(payload.soundsEnabled ?? current.soundsEnabled),
      fullscreenMode: Boolean(payload.fullscreenMode ?? current.fullscreenMode),
      schemaVersion: Number(payload.schemaVersion ?? current.schemaVersion),
      // Les secrets et les verrous PIN sont exclusivement locaux.
      pinHash: current.pinHash, pinSalt: current.pinSalt, pinIterations: current.pinIterations,
      failedAttempts: current.failedAttempts, lockedUntil: current.lockedUntil,
    });
  }
}

/** Réconciliation complète explicite, utilisée au démarrage et après reconnexion Realtime. */
export async function pullAll(client: SupabaseClient, userId: string, database: JukeboxDatabase = activeDb): Promise<void> {
  const records = await fetchRecords(client, userId);
  const categoriesById = activePayload(records, 'category');
  const songsById = activePayload(records, 'song');
  const playlistsById = activePayload(records, 'playlist');
  const categories = Object.values(categoriesById);
  const songs = Object.values(songsById);
  const playlists = Object.values(playlistsById);
  if (categories.length === 0) {
    throw new Error('La bibliothèque cloud ne contient aucune catégorie active. Les données locales ont été conservées.');
  }

  const data = parseBackup({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
    songs,
    playlists,
  });

  await restoreBackup(data, database, { enqueueSync: false });
  await database.transaction('rw', database.stickers, database.gameProgress, async () => {
    await database.stickers.clear();
    await database.gameProgress.clear();
  });
  for (const row of records) {
    if (row.entity_type === 'settings' || row.entity_type === 'sticker' || row.entity_type === 'game_progress') {
      await applyRecord(row, database);
    }
  }

  // Les tombstones sont appliqués après restauration pour les entités supprimées.
  for (const row of records) {
    if (row.deleted_at && ['category', 'song', 'playlist', 'sticker', 'game_progress'].includes(row.entity_type)) {
      await applyRecord(row, database);
    }
  }
}

/** Applique un événement Realtime à une seule entité si aucune mutation locale ne la précède. */
async function applyRealtimeRecord(row: SyncRecord, database: JukeboxDatabase): Promise<void> {
  const pending = await database.syncOutbox.where('[entityType+entityId]').equals([row.entity_type, row.entity_id]).count().catch(() => 0);
  if (pending > 0) {
    scheduleFlush();
    return;
  }
  await applyRecord(row, database);
}

async function checkDeletionThreshold(client: SupabaseClient, userId: string, database: JukeboxDatabase): Promise<boolean> {
  const pending = await database.syncOutbox.where('ownerUserId').equals(userId).toArray();
  const deletes = pending.filter((entry) => entry.operation === 'delete');
  if (deletes.length === 0) {
    setStatus({ confirmationRequired: false, pendingDeleteCount: 0 });
    return false;
  }
  const byType = new Map<SyncEntityType, number>();
  for (const entry of deletes) byType.set(entry.entityType, (byType.get(entry.entityType) ?? 0) + 1);
  let blocked = false;
  for (const [type, count] of byType) {
    const remoteCount = await countRemote(client, userId, type);
    if (remoteCount > 0 && count / remoteCount > 0.3) blocked = true;
  }
  const signature = deletes.map((entry) => entry.operationId).sort().join('|');
  const approved = signature.length > 0 && signature === approvedDeletionSignature;
  setStatus({ confirmationRequired: blocked && !approved, pendingDeleteCount: deletes.length });
  return blocked && !approved;
}

async function drainOutbox(client: SupabaseClient, userId: string, database: JukeboxDatabase): Promise<void> {
  if (await checkDeletionThreshold(client, userId, database)) {
    throw new Error('Confirmation parentale requise : cette synchronisation supprimerait plus de 30 % des éléments cloud.');
  }
  const queue = await database.syncOutbox.where('ownerUserId').equals(userId).sortBy('createdAt');
  for (const entry of queue) {
    try {
      const result = await client.rpc('merge_sync_record', {
        p_operation_id: entry.operationId,
        p_entity_type: entry.entityType,
        p_entity_id: entry.entityId,
        p_operation: entry.operation,
        p_patch: entry.patch,
        p_device_id: deviceId(),
      });
      if (result.error) throw result.error;
      if (entry.id !== undefined) await database.syncOutbox.delete(entry.id);
    } catch (error) {
      if (entry.id !== undefined) {
        await database.syncOutbox.update(entry.id, { attempts: entry.attempts + 1 });
      }
      throw error;
    }
  }
  approvedDeletionSignature = '';
  setStatus({ confirmationRequired: false, pendingDeleteCount: 0 });
}

function scheduleFlush(): void {
  if (!status.userId || !navigator.onLine) return;
  clearTimeout(flushTimer);
  // Laisser la transaction Dexie qui a créé l'opération se terminer avant de la lire.
  flushTimer = setTimeout(() => void syncNow(), 900);
}
async function flushInternal(): Promise<void> {
  const client = supabase;
  const userId = status.userId;
  if (!client || !userId || !navigator.onLine) return;
  setStatus({ state: 'syncing', error: null });
  try {
    await drainOutbox(client, userId, activeDb);
    const remaining = await activeDb.syncOutbox.where('ownerUserId').equals(userId).count();
    if (remaining === 0) {
      await pullAll(client, userId, activeDb);
      localStorage.removeItem(`${LEGACY_DIRTY_PREFIX}${userId}`);
      setStatus({ state: 'idle', lastSyncedAt: Date.now(), error: null });
    } else {
      setStatus({ state: 'idle' });
      rerunRequested = true;
    }
  } catch (error) {
    setStatus({
      state: 'error',
      error: messageOf(error),
      confirmationRequired: messageOf(error).includes('Confirmation parentale requise'),
    });
  }
}

export async function pushAll(client: SupabaseClient, userId: string, database: JukeboxDatabase = activeDb): Promise<void> {
  activeDb = database;
  await drainOutbox(client, userId, database);
}

export async function startSync(userId: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  const client = supabase;
  if (!client) return;
  activeDb = database;
  clearTimeout(remoteTimer);
  setStatus({ state: 'syncing', userId, error: null, realtime: 'connecting', confirmationRequired: false });
  try {
    const previousOwner = localStorage.getItem(OWNER_KEY);
    const remoteCategories = await countRemote(client, userId, 'category');
    const remoteEmpty = remoteCategories === 0;
    const pending = await database.syncOutbox.count();
    if (previousOwner && previousOwner !== userId && pending > 0) {
      throw new Error('Des opérations locales de la famille précédente sont encore en attente. Reconnecte-toi à cet ancien compte pour les envoyer, ou exporte la bibliothèque avant de changer de famille.');
    }
    if (!previousOwner || previousOwner === userId) {
      await database.syncOutbox.filter((entry) => !entry.ownerUserId).modify({ ownerUserId: userId });
    }
    const legacyDirty = localStorage.getItem(`${LEGACY_DIRTY_PREFIX}${userId}`) === '1';

    if (previousOwner && previousOwner !== userId) {
      if (remoteEmpty) {
        throw new Error('Ce compte ne possède pas encore de bibliothèque. Les données de la famille précédente restent locales et ne seront pas envoyées automatiquement.');
      }
      await pullAll(client, userId, database);
    } else if (remoteEmpty) {
      await queueInitialSnapshot(database, userId);
      await drainOutbox(client, userId, database);
      await pullAll(client, userId, database);
    } else if (pending > 0 || legacyDirty) {
      if (legacyDirty) await queueInitialSnapshot(database, userId);
      await drainOutbox(client, userId, database);
      await pullAll(client, userId, database);
    } else {
      await pullAll(client, userId, database);
    }

    localStorage.setItem(OWNER_KEY, userId);
    setStatus({ state: 'idle', lastSyncedAt: Date.now(), error: null });
    connectRealtime(client, userId);
    installOnlineListener();
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error), realtime: 'disconnected' });
    if (status.confirmationRequired) {
      connectRealtime(client, userId);
      installOnlineListener();
    }
  }
}

function connectRealtime(client: SupabaseClient, userId: string): void {
  if (channel) void client.removeChannel(channel);
  setStatus({ realtime: 'connecting' });
  channel = client.channel(`jukebox-family-${userId}`);
  channel.on('postgres_changes', {
    event: '*', schema: 'public', table: 'sync_records', filter: `user_id=eq.${userId}`,
  }, (payload) => {
    const row = payload.new as SyncRecord | undefined;
    if (!row || !row.entity_type || row.device_id === deviceId()) return;
    void applyRealtimeRecord(row, activeDb).catch((error) => {
      setStatus({ state: 'error', error: messageOf(error) });
    });
  });
  channel.subscribe((state) => {
    if (state === 'SUBSCRIBED') {
      setStatus({ realtime: 'connected' });
      // Reconciliation de rattrapage après une période hors ligne ou une reconnexion.
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(() => {
        void activeDb.syncOutbox.where('ownerUserId').equals(userId).count().then((count) => {
          if (count === 0) {
            return pullAll(client, userId, activeDb).then(() => setStatus({ state: 'idle', lastSyncedAt: Date.now() }));
          }
          return undefined;
        }).catch((error) => setStatus({ state: 'error', error: messageOf(error) }));
      }, REMOTE_DEBOUNCE_MS);
    } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
      setStatus({ realtime: 'disconnected' });
    }
  });
}

function installOnlineListener(): void {
  if (onlineListenerInstalled) return;
  onlineListenerInstalled = true;
  window.addEventListener('leanna:sync-outbox-changed', () => {
    if (status.userId) scheduleFlush();
  });
  window.addEventListener('online', () => {
    if (!status.userId) return;
    void activeDb.syncOutbox.where('ownerUserId').equals(status.userId).count().then((count) => {
      if (count > 0) scheduleFlush();
      else if (supabase && status.userId) return pullAll(supabase, status.userId, activeDb);
      return undefined;
    }).catch((error) => setStatus({ state: 'error', error: messageOf(error) }));
  });
}

export async function confirmPendingDeletions(): Promise<void> {
  const userId = status.userId;
  if (!userId) return;
  const deletes = (await activeDb.syncOutbox.where('ownerUserId').equals(userId).toArray())
    .filter((entry) => entry.operation === 'delete');
  approvedDeletionSignature = deletes.map((entry) => entry.operationId).sort().join('|');
  setStatus({ confirmationRequired: false, error: null });
}

export function stopSync(): void {
  clearTimeout(remoteTimer);
  clearTimeout(flushTimer);
  if (channel && supabase) void supabase.removeChannel(channel);
  channel = null;
  approvedDeletionSignature = '';
  rerunRequested = false;
  setStatus({
    state: 'idle', userId: null, lastSyncedAt: null, error: null,
    realtime: 'disconnected', confirmationRequired: false, pendingDeleteCount: 0,
  });
}

export async function syncNow(): Promise<void> {
  if (flushPromise) {
    rerunRequested = true;
    return flushPromise;
  }
  flushPromise = flushInternal().finally(() => {
    flushPromise = null;
    if (rerunRequested) {
      rerunRequested = false;
      void syncNow();
    }
  });
  return flushPromise;
}

export async function restoreFromCloud(): Promise<void> {
  const client = supabase;
  const userId = status.userId;
  if (!client || !userId) return;
  const pending = await activeDb.syncOutbox.where('ownerUserId').equals(userId).count();
  if (pending > 0) throw new Error('Des opérations locales sont encore en attente. Synchronise-les avant de remplacer les données locales par celles du cloud.');
  setStatus({ state: 'syncing', error: null });
  try {
    await pullAll(client, userId, activeDb);
    setStatus({ state: 'idle', lastSyncedAt: Date.now() });
  } catch (error) {
    setStatus({ state: 'error', error: messageOf(error) });
    throw error;
  }
}
