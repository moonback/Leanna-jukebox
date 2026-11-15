import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JukeboxDatabase } from './database';
import { enqueueSyncOperation } from './syncOutbox';

let database: JukeboxDatabase;

beforeEach(() => {
  database = new JukeboxDatabase(`outbox-test-${Math.random().toString(36).slice(2)}`);
  localStorage.setItem('leanna-cloud-owner', 'family-a');
});

afterEach(async () => {
  database.close();
  await database.delete();
  localStorage.removeItem('leanna-cloud-owner');
});

describe('outbox de synchronisation locale', () => {
  it('conserve une mutation dans IndexedDB avec un UUID et son compte familial', async () => {
    await database.transaction('rw', database.syncOutbox, async () => {
      await enqueueSyncOperation(database, 'song', 'song-1', 'upsert', { title: 'Comptine' });
    });

    const [entry] = await database.syncOutbox.toArray();
    expect(entry?.operationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(entry?.ownerUserId).toBe('family-a');
    expect(entry?.entityType).toBe('song');
    expect(entry?.patch).toEqual({ title: 'Comptine' });
    expect(entry?.attempts).toBe(0);
  });

  it('n’inscrit jamais les secrets PIN dans les opérations cloud', async () => {
    await database.transaction('rw', database.syncOutbox, async () => {
      await enqueueSyncOperation(database, 'settings', 'parent', 'upsert', {
        maxVolumePreference: 65,
        pinHash: 'secret-hash',
        pinSalt: 'secret-salt',
        pinIterations: 210000,
        failedAttempts: 4,
        lockedUntil: 123,
      });
    });

    const [entry] = await database.syncOutbox.toArray();
    expect(entry?.patch).toEqual({ maxVolumePreference: 65 });
    expect(JSON.stringify(entry)).not.toContain('secret');
  });

  it('enregistre les suppressions comme tombstones explicites et rejouables', async () => {
    await database.transaction('rw', database.syncOutbox, async () => {
      await enqueueSyncOperation(database, 'playlist', 'playlist-1', 'delete');
    });

    const [entry] = await database.syncOutbox.toArray();
    expect(entry?.operation).toBe('delete');
    expect(entry?.patch).toEqual({});
    expect(entry?.ownerUserId).toBe('family-a');
  });

  it('ne crée pas d’opération lorsque le patch ne contient que des champs PIN locaux', async () => {
    await database.transaction('rw', database.syncOutbox, async () => {
      await enqueueSyncOperation(database, 'settings', 'parent', 'upsert', { pinHash: 'secret' });
    });
    expect(await database.syncOutbox.count()).toBe(0);
  });
});
