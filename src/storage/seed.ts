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

/**
 * Chansons FICTIVES de démonstration. Elles n'ont pas de vidéo : elles ne sont jamais présentées
 * comme de vraies chansons jouables. Le parent les remplace par ses propres liens YouTube.
 */
export const DEMO_SONGS: Array<Pick<Song, 'title' | 'categoryId' | 'illustration'>> = [
  { title: 'Démo : Le lapin malin', categoryId: 'cat-comptines', illustration: 'bunny' },
  { title: 'Démo : L’ourson qui danse', categoryId: 'cat-danse', illustration: 'bear' },
  { title: 'Démo : Le renard et les étoiles', categoryId: 'cat-histoires', illustration: 'fox' },
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
          id: `demo-${index + 1}`,
          title: demo.title,
          youtubeVideoId: '',
          categoryId: demo.categoryId,
          illustration: demo.illustration,
          favorite: false,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
          isDemo: true,
        })),
      );
    }
    if ((await database.settings.get('parent')) === undefined) {
      await database.settings.put(defaultSettings());
    }
  });
}
