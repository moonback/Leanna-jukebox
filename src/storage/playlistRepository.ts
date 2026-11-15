import { db as defaultDb, type JukeboxDatabase } from './database';
import { AppError } from '../services/errors';
import { isIllustrationKey, type IllustrationKey } from '../illustrations/illustrationKeys';
import type { Playlist } from '../types/playlist';
import { enqueueSyncOperation } from './syncOutbox';

export const MAX_PLAYLIST_TITLE = 60;

export function validatePlaylistFields(title: string, illustration: unknown): { title: string; illustration: IllustrationKey } {
  const trimmed = title.trim();
  if (trimmed.length === 0) throw new AppError('validation', 'Donne un nom à la playlist.');
  if (trimmed.length > MAX_PLAYLIST_TITLE) {
    throw new AppError('validation', `Le nom ne doit pas dépasser ${MAX_PLAYLIST_TITLE} caractères.`);
  }
  if (!isIllustrationKey(illustration)) throw new AppError('validation', 'Choisis une illustration.');
  return { title: trimmed, illustration };
}

export async function listPlaylists(database: JukeboxDatabase = defaultDb): Promise<Playlist[]> {
  return database.playlists.orderBy('sortOrder').toArray();
}

export async function createPlaylist(
  input: { title: string; illustration: IllustrationKey },
  database: JukeboxDatabase = defaultDb,
  now = Date.now(),
): Promise<Playlist> {
  const valid = validatePlaylistFields(input.title, input.illustration);
  return database.transaction('rw', database.playlists, database.syncOutbox, async () => {
    const last = await database.playlists.orderBy('sortOrder').last();
    const playlist: Playlist = {
      id: crypto.randomUUID?.() ?? `playlist-${now}-${Math.random().toString(36).slice(2, 10)}`,
      title: valid.title,
      illustration: valid.illustration,
      songIds: [],
      sortOrder: (last?.sortOrder ?? -1) + 1,
      createdAt: now,
    };
    await database.playlists.add(playlist);
    await enqueueSyncOperation(database, 'playlist', playlist.id, 'upsert', { ...playlist });
    return playlist;
  });
}

export async function updatePlaylist(
  id: string,
  patch: { title?: string; illustration?: IllustrationKey },
  database: JukeboxDatabase = defaultDb,
): Promise<void> {
  const current = await database.playlists.get(id);
  if (!current) throw new AppError('not-found', 'Cette playlist n’existe plus.');
  const valid = validatePlaylistFields(patch.title ?? current.title, patch.illustration ?? current.illustration);
  await database.transaction('rw', database.playlists, database.syncOutbox, async () => {
    await database.playlists.update(id, valid);
    await enqueueSyncOperation(database, 'playlist', id, 'upsert', valid);
  });
}

export async function deletePlaylist(id: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', database.playlists, database.syncOutbox, async () => {
    await database.playlists.delete(id);
    await enqueueSyncOperation(database, 'playlist', id, 'delete');
  });
}

/** Ajoute une chanson en fin de playlist. Les doublons sont ignorés. */
export async function addSongToPlaylist(playlistId: string, songId: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', database.playlists, database.songs, database.syncOutbox, async () => {
    const playlist = await database.playlists.get(playlistId);
    if (!playlist) throw new AppError('not-found', 'Cette playlist n’existe plus.');
    if (!(await database.songs.get(songId))) throw new AppError('not-found', 'Cette chanson n’existe plus.');
    if (playlist.songIds.includes(songId)) return;
    const songIds = [...playlist.songIds, songId];
    await database.playlists.update(playlistId, { songIds });
    await enqueueSyncOperation(database, 'playlist', playlistId, 'upsert', { songIds });
  });
}

export async function removeSongFromPlaylist(playlistId: string, songId: string, database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', database.playlists, database.syncOutbox, async () => {
    const playlist = await database.playlists.get(playlistId);
    if (!playlist) throw new AppError('not-found', 'Cette playlist n’existe plus.');
    const songIds = playlist.songIds.filter((s) => s !== songId);
    await database.playlists.update(playlistId, { songIds });
    await enqueueSyncOperation(database, 'playlist', playlistId, 'upsert', { songIds });
  });
}

/** Déplace une chanson de la playlist vers le haut (-1) ou le bas (+1). */
export async function movePlaylistSong(playlistId: string, songId: string, direction: -1 | 1, database: JukeboxDatabase = defaultDb): Promise<void> {
  await database.transaction('rw', database.playlists, database.syncOutbox, async () => {
    const playlist = await database.playlists.get(playlistId);
    if (!playlist) throw new AppError('not-found', 'Cette playlist n’existe plus.');
    const index = playlist.songIds.indexOf(songId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= playlist.songIds.length) return;
    const songIds = [...playlist.songIds];
    const moved = songIds[index];
    const other = songIds[target];
    if (moved === undefined || other === undefined) return;
    songIds[index] = other;
    songIds[target] = moved;
    await database.playlists.update(playlistId, { songIds });
    await enqueueSyncOperation(database, 'playlist', playlistId, 'upsert', { songIds });
  });
}
