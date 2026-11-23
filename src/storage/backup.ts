import { db as defaultDb, type JukeboxDatabase } from './database';
import { ensureSeeded } from './seed';
import { AppError } from '../services/errors';
import { isIllustrationKey } from '../illustrations/illustrationKeys';
import type { Song } from '../types/song';
import type { Playlist } from '../types/playlist';
import type { Category } from '../types/category';
import { enqueueSyncOperation } from './syncOutbox';

export const BACKUP_FORMAT = 'leanna-jukebox-backup';
export const BACKUP_VERSION = 1;
const MAX_ITEMS = 2000;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Sauvegarde : chansons, playlists et catégories uniquement. Le PIN et les réglages ne sont jamais exportés. */
export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  songs: Song[];
  playlists: Playlist[];
  categories: Category[];
}

export interface BackupData {
  songs: Song[];
  playlists: Playlist[];
  categories: Category[];
}

export async function buildBackup(database: JukeboxDatabase = defaultDb, now = new Date()): Promise<BackupFile> {
  const [songs, playlists, categories] = await Promise.all([
    database.songs.toArray(),
    database.playlists.toArray(),
    database.categories.toArray(),
  ]);
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), songs, playlists, categories };
}

function fail(message: string): never {
  throw new AppError('validation', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) fail(`Champ invalide : ${field}.`);
  return value;
}

function expectNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Champ invalide : ${field}.`);
  return value;
}

/**
 * Valide entièrement un fichier de sauvegarde (c'est une frontière de confiance : le fichier vient de l'extérieur).
 * Toute incohérence rejette le fichier entier, sans import partiel.
 */
export function parseBackup(raw: unknown): BackupData {
  if (!isRecord(raw)) fail('Ce fichier n’est pas une sauvegarde Leanna Jukebox.');
  if (raw.format !== BACKUP_FORMAT || raw.version !== BACKUP_VERSION) fail('Version de sauvegarde non reconnue.');
  const { songs, playlists, categories } = raw;
  if (!Array.isArray(songs) || !Array.isArray(playlists) || !Array.isArray(categories)) fail('Sauvegarde incomplète.');
  if (songs.length > MAX_ITEMS || playlists.length > MAX_ITEMS || categories.length > MAX_ITEMS) {
    fail('Sauvegarde trop volumineuse.');
  }

  const parsedCategories: Category[] = categories.map((c) => {
    if (!isRecord(c)) fail('Catégorie invalide.');
    if (!isIllustrationKey(c.illustration)) fail('Illustration de catégorie invalide.');
    return {
      id: expectString(c.id, 'catégorie.id', 80),
      title: expectString(c.title, 'catégorie.title', 60),
      illustration: c.illustration,
      sortOrder: expectNumber(c.sortOrder, 'catégorie.sortOrder'),
    };
  });
  const categoryIds = new Set(parsedCategories.map((c) => c.id));
  if (categoryIds.size !== parsedCategories.length) fail('Identifiants de catégorie en double.');

  const parsedSongs: Song[] = songs.map((s) => {
    if (!isRecord(s)) fail('Chanson invalide.');
    const isDemo = s.isDemo === true;
    const videoId = typeof s.youtubeVideoId === 'string' ? s.youtubeVideoId : '';
    if (!isDemo && !VIDEO_ID_PATTERN.test(videoId)) fail('Lien YouTube invalide dans la sauvegarde.');
    if (!categoryIds.has(expectString(s.categoryId, 'chanson.categoryId', 80))) fail('Chanson sans catégorie valide.');
    if (!isIllustrationKey(s.illustration)) fail('Illustration de chanson invalide.');
    const song: Song = {
      id: expectString(s.id, 'chanson.id', 80),
      title: expectString(s.title, 'chanson.title', 80),
      youtubeVideoId: isDemo ? '' : videoId,
      categoryId: s.categoryId as string,
      illustration: s.illustration,
      favorite: s.favorite === true,
      sortOrder: expectNumber(s.sortOrder, 'chanson.sortOrder'),
      createdAt: expectNumber(s.createdAt, 'chanson.createdAt'),
      updatedAt: expectNumber(s.updatedAt, 'chanson.updatedAt'),
    };
    if (typeof s.lastPlayedAt === 'number') song.lastPlayedAt = s.lastPlayedAt;
    if (isDemo) song.isDemo = true;
    return song;
  });
  const songIds = new Set(parsedSongs.map((s) => s.id));
  if (songIds.size !== parsedSongs.length) fail('Identifiants de chanson en double.');

  const parsedPlaylists: Playlist[] = playlists.map((p) => {
    if (!isRecord(p)) fail('Playlist invalide.');
    if (!isIllustrationKey(p.illustration)) fail('Illustration de playlist invalide.');
    if (!Array.isArray(p.songIds)) fail('Liste de chansons de playlist invalide.');
    return {
      id: expectString(p.id, 'playlist.id', 80),
      title: expectString(p.title, 'playlist.title', 60),
      illustration: p.illustration,
      // Les références vers des chansons absentes du fichier sont retirées silencieusement.
      songIds: p.songIds.filter((id): id is string => typeof id === 'string' && songIds.has(id)),
      sortOrder: expectNumber(p.sortOrder, 'playlist.sortOrder'),
      createdAt: expectNumber(p.createdAt, 'playlist.createdAt'),
    };
  });

  return { songs: parsedSongs, playlists: parsedPlaylists, categories: parsedCategories };
}

/** Remplace les chansons, playlists et catégories par celles de la sauvegarde, en une seule transaction. */
export async function restoreBackup(
  data: BackupData,
  database: JukeboxDatabase = defaultDb,
  options: { enqueueSync?: boolean } = {},
): Promise<void> {
  if (data.categories.length === 0) fail('La sauvegarde doit contenir au moins une catégorie.');
  await database.transaction('rw', database.songs, database.playlists, database.categories, database.syncOutbox, async () => {
    const [oldSongs, oldPlaylists, oldCategories] = await Promise.all([
      database.songs.toArray(), database.playlists.toArray(), database.categories.toArray(),
    ]);
    const nextSongIds = new Set(data.songs.map((row) => row.id));
    const nextPlaylistIds = new Set(data.playlists.map((row) => row.id));
    const nextCategoryIds = new Set(data.categories.map((row) => row.id));

    if (options.enqueueSync !== false) {
      for (const row of oldSongs) if (!nextSongIds.has(row.id)) await enqueueSyncOperation(database, 'song', row.id, 'delete');
      for (const row of oldPlaylists) if (!nextPlaylistIds.has(row.id)) await enqueueSyncOperation(database, 'playlist', row.id, 'delete');
      for (const row of oldCategories) if (!nextCategoryIds.has(row.id)) await enqueueSyncOperation(database, 'category', row.id, 'delete');
      for (const row of data.categories) await enqueueSyncOperation(database, 'category', row.id, 'upsert', { ...row });
      for (const row of data.songs) await enqueueSyncOperation(database, 'song', row.id, 'upsert', { ...row });
      for (const row of data.playlists) await enqueueSyncOperation(database, 'playlist', row.id, 'upsert', { ...row });
    }

    await database.songs.clear();
    await database.playlists.clear();
    await database.categories.clear();
    await database.categories.bulkAdd(data.categories);
    await database.songs.bulkAdd(data.songs);
    await database.playlists.bulkAdd(data.playlists);
  });
}

/** Supprime toutes les données locales (chansons, playlists, catégories, PIN et réglages), puis réinitialise. */
export async function deleteAllData(database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', [
    database.songs, database.playlists, database.categories, database.settings,
    database.stickers, database.gameProgress, database.syncOutbox,
  ], async () => {
      const [songs, playlists, categories, stickers, progress] = await Promise.all([
        database.songs.toArray(), database.playlists.toArray(), database.categories.toArray(),
        database.stickers.toArray(), database.gameProgress.toArray(),
      ]);
      for (const row of songs) await enqueueSyncOperation(database, 'song', row.id, 'delete');
      for (const row of playlists) await enqueueSyncOperation(database, 'playlist', row.id, 'delete');
      for (const row of categories) await enqueueSyncOperation(database, 'category', row.id, 'delete');
      for (const row of stickers) await enqueueSyncOperation(database, 'sticker', row.id, 'delete');
      for (const row of progress) await enqueueSyncOperation(database, 'game_progress', row.gameId, 'delete');
      await database.songs.clear();
      await database.playlists.clear();
      await database.categories.clear();
      await database.settings.clear();
      await database.stickers.clear();
      await database.gameProgress.clear();
    });
  try { localStorage.removeItem('leanna-stickers'); } catch { /* Storage optionnel. */ }
  await ensureSeeded(database);
  const [songs, playlists, categories] = await Promise.all([
    database.songs.toArray(), database.playlists.toArray(), database.categories.toArray(),
  ]);
  await database.transaction('rw', database.syncOutbox, database.settings, async () => {
    for (const row of categories) await enqueueSyncOperation(database, 'category', row.id, 'upsert', { ...row });
    for (const row of songs) await enqueueSyncOperation(database, 'song', row.id, 'upsert', { ...row });
    for (const row of playlists) await enqueueSyncOperation(database, 'playlist', row.id, 'upsert', { ...row });
    await enqueueSyncOperation(database, 'settings', 'parent', 'upsert', { maxSessionMinutes: 0, maxVolumePreference: 80, childMode: false, soundsEnabled: false, fullscreenMode: false, videosEnabled: false, schemaVersion: 1 });
  });
}
