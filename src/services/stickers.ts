import { IMAGIER_ITEMS } from '../data/imagier';
import { db as defaultDb, type JukeboxDatabase } from '../storage/database';
import { enqueueSyncOperation } from '../storage/syncOutbox';

const LEGACY_KEY = 'leanna-stickers';
const MIGRATION_KEY = 'legacy-stickers-v1';

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Migre une seule fois les autocollants de l'ancien localStorage vers IndexedDB. */
export async function migrateLegacyStickers(database: JukeboxDatabase = defaultDb): Promise<void> {
  if (await database.syncMeta.get(MIGRATION_KEY)) return;
  let legacy: string[] = [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '[]');
    if (Array.isArray(raw)) legacy = raw.filter((value): value is string => typeof value === 'string').slice(0, 2000);
  } catch {
    // Une ancienne valeur invalide ne doit pas bloquer l'album.
  }

  await database.transaction('rw', database.stickers, database.syncOutbox, database.syncMeta, async () => {
    for (const [index, emoji] of legacy.entries()) {
      const id = `legacy-${index}-${makeId()}`;
      const record = { id, emoji, createdAt: Date.now() + index };
      await database.stickers.put(record);
      await enqueueSyncOperation(database, 'sticker', id, 'upsert', record);
    }
    await database.syncMeta.put({ key: MIGRATION_KEY, value: 'done' });
  });
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* Storage optionnel. */ }
}

/** Donne un autocollant et le conserve dans IndexedDB + outbox pour les autres appareils. */
export async function awardSticker(emoji?: string, database: JukeboxDatabase = defaultDb): Promise<string> {
  const chosen = emoji ?? IMAGIER_ITEMS[Math.floor(Math.random() * IMAGIER_ITEMS.length)]!.emoji;
  const record = { id: makeId(), emoji: chosen, createdAt: Date.now() };
  await database.transaction('rw', database.stickers, database.syncOutbox, async () => {
    await database.stickers.add(record);
    await enqueueSyncOperation(database, 'sticker', record.id, 'upsert', record);
  });
  return chosen;
}
