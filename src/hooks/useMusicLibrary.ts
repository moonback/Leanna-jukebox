import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../storage/database';
import { recentSongs } from '../storage/songRepository';
import type { Song } from '../types/song';
import type { Category } from '../types/category';
import type { Playlist } from '../types/playlist';

export interface MusicLibrary {
  songs: Song[];
  favorites: Song[];
  recent: Song[];
  categories: Category[];
  playlists: Playlist[];
  /** Vrai une fois la lecture de la base terminée (évite l'écran vide pendant le chargement). */
  ready: boolean;
}

/** Données de la bibliothèque, mises à jour automatiquement à chaque écriture dans IndexedDB. */
export function useMusicLibrary(): MusicLibrary {
  const songs = useLiveQuery(() => db.songs.orderBy('sortOrder').toArray(), [], undefined);
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), [], undefined);
  const playlists = useLiveQuery(() => db.playlists.orderBy('sortOrder').toArray(), [], undefined);
  const recent = useLiveQuery(() => recentSongs(12), [], undefined);

  const allSongs = songs ?? [];
  return {
    songs: allSongs,
    favorites: allSongs.filter((s) => s.favorite),
    recent: recent ?? [],
    categories: categories ?? [],
    playlists: playlists ?? [],
    ready: songs !== undefined && categories !== undefined && playlists !== undefined,
  };
}
