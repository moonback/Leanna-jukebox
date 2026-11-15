import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('contrat de synchronisation familiale Phase 2', () => {
  it('utilise des tombstones et une fonction serveur de fusion idempotente', () => {
    const sql = read('supabase/migrations/202611160001_sync_outbox_lww.sql');
    expect(sql).toMatch(/deleted_at\s+timestamptz/);
    expect(sql).toMatch(/server_updated_at\s+timestamptz/);
    expect(sql).toMatch(/field_versions\s+jsonb/);
    expect(sql).toMatch(/sync_operation_receipts/);
    expect(sql).toMatch(/merge_sync_record/);
    expect(sql).toMatch(/auth\.uid\(\)/);
  });

  it('ne déduit jamais les suppressions à partir d’une liste locale absente', () => {
    const sync = read('src/storage/cloud/sync.ts');
    expect(sync).not.toMatch(/deleteMissing/);
    expect(sync).toMatch(/operation === 'delete'/);
    expect(sync).toMatch(/deleted_at/);
  });

  it('demande une confirmation parentale au-delà du seuil strict de 30 %', () => {
    const sync = read('src/storage/cloud/sync.ts');
    expect(sync).toMatch(/count \/ remoteCount > 0\.3/);
    expect(sync).toMatch(/confirmationRequired/);
    const card = read('src/components/parental/CloudSyncCard.tsx');
    expect(card).toMatch(/Confirmer les suppressions/);
  });

  it('applique les événements Realtime de façon ciblée et garde un rattrapage complet', () => {
    const sync = read('src/storage/cloud/sync.ts');
    expect(sync).toMatch(/applyRealtimeRecord\(row/);
    expect(sync).toMatch(/pullAll\(client, userId/);
  });

  it('conserve les autocollants et les manches de jeux dans IndexedDB', () => {
    const database = read('src/storage/database.ts');
    expect(database).toMatch(/stickers:/);
    expect(database).toMatch(/gameProgress:/);
    expect(read('src/services/stickers.ts')).toMatch(/migrateLegacyStickers/);
    expect(read('src/services/gameProgress.ts')).toMatch(/recordGameRound/);
  });
});
