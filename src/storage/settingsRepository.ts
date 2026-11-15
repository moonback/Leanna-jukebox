import { db as defaultDb, type JukeboxDatabase } from './database';
import { defaultSettings } from './seed';
import type { ParentSettings } from '../types/settings';
import { enqueueSyncOperation } from './syncOutbox';

export async function getSettings(database: JukeboxDatabase = defaultDb): Promise<ParentSettings> {
  return (await database.settings.get('parent')) ?? defaultSettings();
}

export async function updateSettings(
  patch: Partial<Omit<ParentSettings, 'key'>>,
  database: JukeboxDatabase = defaultDb,
): Promise<ParentSettings> {
  return database.transaction('rw', database.settings, database.syncOutbox, async () => {
    const current = (await database.settings.get('parent')) ?? defaultSettings();
    const next: ParentSettings = { ...current, ...patch, key: 'parent' };
    await database.settings.put(next);
    await enqueueSyncOperation(database, 'settings', 'parent', 'upsert', patch as Record<string, unknown>);
    return next;
  });
}
