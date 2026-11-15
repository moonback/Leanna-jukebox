import Dexie, { type Table } from 'dexie';
import type { Song } from '../types/song';
import type { Playlist } from '../types/playlist';
import type { Category } from '../types/category';
import type { ParentSettings } from '../types/settings';

export interface StickerRecord {
  id: string;
  emoji: string;
  createdAt: number;
}

export interface GameProgressRecord {
  gameId: string;
  completedRounds: number;
  lastPlayedAt: number;
  updatedAt: number;
}

export type SyncEntityType = 'song' | 'playlist' | 'category' | 'settings' | 'sticker' | 'game_progress';
export interface SyncOutboxRecord {
  id?: number;
  operationId: string;
  ownerUserId?: string | null;
  entityType: SyncEntityType;
  entityId: string;
  operation: 'upsert' | 'delete';
  patch: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

/**
 * Base locale IndexedDB (Dexie). Les booléens ne sont pas indexés : `favorite` est filtré en mémoire.
 * Toute évolution de schéma passe par une nouvelle `version(n)` avec ses migrations.
 */
export class JukeboxDatabase extends Dexie {
  songs!: Table<Song, string>;
  playlists!: Table<Playlist, string>;
  categories!: Table<Category, string>;
  settings!: Table<ParentSettings, string>;
  stickers!: Table<StickerRecord, string>;
  gameProgress!: Table<GameProgressRecord, string>;
  syncOutbox!: Table<SyncOutboxRecord, number>;
  syncMeta!: Table<{ key: string; value: string }, string>;

  constructor(name = 'leanna-jukebox') {
    super(name);
    this.version(1).stores({
      songs: 'id, categoryId, sortOrder, lastPlayedAt, youtubeVideoId',
      playlists: 'id, sortOrder',
      categories: 'id, sortOrder',
      settings: 'key',
    });
    this.version(2).stores({
      songs: 'id, categoryId, sortOrder, lastPlayedAt, youtubeVideoId',
      playlists: 'id, sortOrder',
      categories: 'id, sortOrder',
      settings: 'key',
      stickers: 'id, createdAt',
      gameProgress: 'gameId, lastPlayedAt',
      syncOutbox: '++id, operationId, ownerUserId, createdAt, entityType, entityId, [entityType+entityId]',
      syncMeta: 'key',
    });
  }
}

export const db = new JukeboxDatabase();
