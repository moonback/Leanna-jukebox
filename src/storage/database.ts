import Dexie, { type Table } from 'dexie';
import type { Song } from '../types/song';
import type { Playlist } from '../types/playlist';
import type { Category } from '../types/category';
import type { ParentSettings } from '../types/settings';

/**
 * Base locale IndexedDB (Dexie). Les booléens ne sont pas indexés : `favorite` est filtré en mémoire.
 * Toute évolution de schéma passe par une nouvelle `version(n)` avec ses migrations.
 */
export class JukeboxDatabase extends Dexie {
  songs!: Table<Song, string>;
  playlists!: Table<Playlist, string>;
  categories!: Table<Category, string>;
  settings!: Table<ParentSettings, string>;

  constructor(name = 'leanna-jukebox') {
    super(name);
    this.version(1).stores({
      songs: 'id, categoryId, sortOrder, lastPlayedAt, youtubeVideoId',
      playlists: 'id, sortOrder',
      categories: 'id, sortOrder',
      settings: 'key',
    });
  }
}

export const db = new JukeboxDatabase();
