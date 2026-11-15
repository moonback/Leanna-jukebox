import { db as defaultDb, type JukeboxDatabase } from './database';
import { AppError } from '../services/errors';
import { isIllustrationKey } from '../illustrations/illustrationKeys';
import type { Song, SongInput } from '../types/song';
import { enqueueSyncOperation } from './syncOutbox';

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const MAX_TITLE_LENGTH = 80;

/** Valide les champs d'une chanson. Une chanson de démonstration n'a pas de vidéo. */
export function validateSongInput(input: SongInput, categoryExists: boolean): SongInput & { title: string } {
  const title = input.title.trim();
  if (title.length === 0) throw new AppError('validation', 'Donne un nom à la chanson.');
  if (title.length > MAX_TITLE_LENGTH) {
    throw new AppError('validation', `Le nom ne doit pas dépasser ${MAX_TITLE_LENGTH} caractères.`);
  }
  if (!input.isDemo && !VIDEO_ID_PATTERN.test(input.youtubeVideoId)) {
    throw new AppError('validation', 'Le lien YouTube est invalide.');
  }
  if (!categoryExists) throw new AppError('validation', 'Choisis une catégorie existante.');
  if (!isIllustrationKey(input.illustration)) throw new AppError('validation', 'Choisis une illustration.');
  return { ...input, title };
}

export async function listSongs(database: JukeboxDatabase = defaultDb): Promise<Song[]> {
  return database.songs.orderBy('sortOrder').toArray();
}

export async function getSong(id: string, database: JukeboxDatabase = defaultDb): Promise<Song | undefined> {
  return database.songs.get(id);
}

export async function addSong(input: SongInput, database: JukeboxDatabase = defaultDb, now = Date.now()): Promise<Song> {
  return database.transaction('rw', database.songs, database.categories, database.syncOutbox, async () => {
    const category = await database.categories.get(input.categoryId);
    const valid = validateSongInput(input, category !== undefined);
    const last = await database.songs.orderBy('sortOrder').last();
    const song: Song = {
      id: crypto.randomUUID?.() ?? `song-${now}-${Math.random().toString(36).slice(2, 10)}`,
      title: valid.title,
      youtubeVideoId: valid.isDemo ? '' : valid.youtubeVideoId,
      categoryId: valid.categoryId,
      illustration: valid.illustration,
      favorite: valid.favorite ?? false,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
      ...(valid.isDemo ? { isDemo: true } : {}),
    };
    await database.songs.add(song);
    await enqueueSyncOperation(database, 'song', song.id, 'upsert', { ...song });
    return song;
  });
}

export async function updateSong(
  id: string,
  patch: Partial<SongInput>,
  database: JukeboxDatabase = defaultDb,
  now = Date.now(),
): Promise<Song> {
  return database.transaction('rw', database.songs, database.categories, database.syncOutbox, async () => {
    const current = await database.songs.get(id);
    if (!current) throw new AppError('not-found', 'Cette chanson n’existe plus.');
    // Une chanson de démonstration devient une vraie chanson dès qu'un lien YouTube lui est donné.
    const hasRealLink = Boolean(patch.youtubeVideoId);
    const merged: SongInput = {
      title: patch.title ?? current.title,
      youtubeVideoId: patch.youtubeVideoId ?? current.youtubeVideoId,
      categoryId: patch.categoryId ?? current.categoryId,
      illustration: patch.illustration ?? current.illustration,
      favorite: patch.favorite ?? current.favorite,
      isDemo: current.isDemo && !hasRealLink,
    };
    const category = await database.categories.get(merged.categoryId);
    const valid = validateSongInput(merged, category !== undefined);
    const updated: Song = {
      ...current,
      title: valid.title,
      youtubeVideoId: valid.isDemo ? '' : valid.youtubeVideoId,
      categoryId: valid.categoryId,
      illustration: valid.illustration,
      favorite: valid.favorite ?? false,
      updatedAt: now,
    };
    if (valid.isDemo) updated.isDemo = true;
    else delete updated.isDemo;
    await database.songs.put(updated);
    await enqueueSyncOperation(database, 'song', id, 'upsert', {
      title: updated.title, youtubeVideoId: updated.youtubeVideoId, categoryId: updated.categoryId,
      illustration: updated.illustration, favorite: updated.favorite, sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt, isDemo: updated.isDemo === true,
    });
    return updated;
  });
}

/** Supprime une chanson et la retire de toutes les playlists, dans une seule transaction. */
export async function deleteSong(id: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', database.songs, database.playlists, database.syncOutbox, async () => {
    await database.songs.delete(id);
    await enqueueSyncOperation(database, 'song', id, 'delete');
    const playlists = await database.playlists.filter((p) => p.songIds.includes(id)).toArray();
    for (const playlist of playlists) {
      const songIds = playlist.songIds.filter((s) => s !== id);
      await database.playlists.update(playlist.id, { songIds });
      await enqueueSyncOperation(database, 'playlist', playlist.id, 'upsert', { songIds });
    }
  });
}

export async function toggleFavorite(id: string, database: JukeboxDatabase = defaultDb, now = Date.now()): Promise<void> {
  await database.transaction('rw', database.songs, database.syncOutbox, async () => {
    const song = await database.songs.get(id);
    if (!song) throw new AppError('not-found', 'Cette chanson n’existe plus.');
    const favorite = !song.favorite;
    await database.songs.update(id, { favorite, updatedAt: now });
    await enqueueSyncOperation(database, 'song', id, 'upsert', { favorite, updatedAt: now });
  });
}

/** Échange la position d'une chanson avec sa voisine (direction -1 = monter, +1 = descendre). */
export async function moveSong(id: string, direction: -1 | 1, database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', database.songs, database.syncOutbox, async () => {
    const ordered = await database.songs.orderBy('sortOrder').toArray();
    const index = ordered.findIndex((s) => s.id === id);
    const neighbour = ordered[index + direction];
    const current = ordered[index];
    if (index < 0 || !neighbour || !current) return;
    await database.songs.update(current.id, { sortOrder: neighbour.sortOrder });
    await database.songs.update(neighbour.id, { sortOrder: current.sortOrder });
    await enqueueSyncOperation(database, 'song', current.id, 'upsert', { sortOrder: neighbour.sortOrder });
    await enqueueSyncOperation(database, 'song', neighbour.id, 'upsert', { sortOrder: current.sortOrder });
  });
}

export async function markPlayed(id: string, database: JukeboxDatabase = defaultDb, now = Date.now()): Promise<void> {
  await database.transaction('rw', database.songs, database.syncOutbox, async () => {
    await database.songs.update(id, { lastPlayedAt: now, updatedAt: now });
    await enqueueSyncOperation(database, 'song', id, 'upsert', { lastPlayedAt: now, updatedAt: now });
  });
}

export async function recentSongs(limit = 12, database: JukeboxDatabase = defaultDb): Promise<Song[]> {
  return database.songs
    .orderBy('lastPlayedAt')
    .reverse()
    .filter((s) => s.lastPlayedAt !== undefined)
    .limit(limit)
    .toArray();
}
