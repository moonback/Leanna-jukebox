import type { JukeboxDatabase } from './database';
import type { Category } from '../types/category';
import type { Song } from '../types/song';
import { CURRENT_SCHEMA_VERSION, type ParentSettings } from '../types/settings';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-comptines', title: 'Comptines', illustration: 'note', sortOrder: 0 },
  { id: 'cat-disney', title: 'Disney', illustration: 'star', sortOrder: 1 },
  { id: 'cat-dessins-animes', title: 'Dessins animés', illustration: 'rainbow', sortOrder: 2 },
  { id: 'cat-animaux', title: 'Animaux', illustration: 'panda', sortOrder: 3 },
  { id: 'cat-preferees', title: 'Chansons préférées', illustration: 'bear', sortOrder: 4 },
  { id: 'cat-danse', title: 'Danse', illustration: 'sun', sortOrder: 5 },
  { id: 'cat-histoires', title: 'Histoires musicales', illustration: 'cloud', sortOrder: 6 },
];

/** Chansons d'exemple fournies au premier lancement (vraies vidéos YouTube, jouables). */
export const DEMO_SONGS: Array<Pick<Song, 'title' | 'youtubeVideoId' | 'categoryId' | 'illustration'>> = [
  { title: 'Waka Waka (This Time for Africa)', youtubeVideoId: 'pRpeEdMmmQ0', categoryId: 'cat-danse', illustration: 'sun' },
  { title: 'Dai Dai', youtubeVideoId: 'fcnDmrtj6Sk', categoryId: 'cat-danse', illustration: 'star' },
];
export function defaultSettings(): ParentSettings {
  return {
    key: 'parent',
    failedAttempts: 0,
    lockedUntil: 0,
    maxSessionMinutes: 0,
    maxVolumePreference: 80,
    childMode: false,
    soundsEnabled: false,
    fullscreenMode: false,
    videosEnabled: false,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

/** Remplit la base au premier lancement (aucune catégorie présente). Idempotent. */
export async function ensureSeeded(database: JukeboxDatabase, now = Date.now()): Promise<void> {
  await database.transaction('rw', database.categories, database.songs, database.settings, async () => {
    if ((await database.categories.count()) === 0) {
      await database.categories.bulkAdd(DEFAULT_CATEGORIES);
      await database.songs.bulkAdd(
        DEMO_SONGS.map((demo, index) => ({
          id: `sample-${index + 1}`,
          title: demo.title,
          youtubeVideoId: demo.youtubeVideoId,
          categoryId: demo.categoryId,
          illustration: demo.illustration,
          favorite: false,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    if ((await database.settings.get('parent')) === undefined) {
      await database.settings.put(defaultSettings());
    }
  });
}
