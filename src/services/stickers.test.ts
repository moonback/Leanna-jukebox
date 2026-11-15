import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JukeboxDatabase } from '../storage/database';
import { awardSticker, migrateLegacyStickers } from './stickers';

let database: JukeboxDatabase;

beforeEach(() => {
  database = new JukeboxDatabase(`stickers-test-${Math.random().toString(36).slice(2)}`);
  localStorage.setItem('leanna-cloud-owner', 'family-a');
});

afterEach(async () => {
  database.close();
  await database.delete();
  localStorage.removeItem('leanna-cloud-owner');
  localStorage.removeItem('leanna-stickers');
});

describe('album d’autocollants synchronisé', () => {
  it('migre les autocollants historiques de localStorage vers IndexedDB et l’outbox', async () => {
    localStorage.setItem('leanna-stickers', JSON.stringify(['🐱', '🐰']));
    await migrateLegacyStickers(database);

    expect((await database.stickers.orderBy('createdAt').toArray()).map((sticker) => sticker.emoji)).toEqual(['🐱', '🐰']);
    expect(await database.syncOutbox.count()).toBe(2);
    expect(localStorage.getItem('leanna-stickers')).toBeNull();

    await migrateLegacyStickers(database);
    expect(await database.stickers.count()).toBe(2);
  });

  it('attribue et journalise un nouvel autocollant', async () => {
    await expect(awardSticker('🐼', database)).resolves.toBe('🐼');
    expect((await database.stickers.toArray())[0]?.emoji).toBe('🐼');
    expect((await database.syncOutbox.toArray())[0]?.entityType).toBe('sticker');
  });
});
