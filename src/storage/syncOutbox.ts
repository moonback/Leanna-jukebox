import type { JukeboxDatabase, SyncEntityType } from './database';

const DEVICE_ONLY_SETTINGS = new Set(['pinHash', 'pinSalt', 'pinIterations', 'failedAttempts', 'lockedUntil']);
const OWNER_KEY = 'leanna-cloud-owner';

function operationId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

/** Enregistre une mutation locale dans la même transaction IndexedDB que l'entité. */
export async function enqueueSyncOperation(
  database: JukeboxDatabase,
  entityType: SyncEntityType,
  entityId: string,
  operation: 'upsert' | 'delete',
  patch: Record<string, unknown> = {},
): Promise<void> {
  const safePatch = entityType === 'settings'
    ? Object.fromEntries(Object.entries(patch).filter(([key]) => !DEVICE_ONLY_SETTINGS.has(key)))
    : patch;

  if (operation === 'upsert' && Object.keys(safePatch).length === 0) return;

  await database.syncOutbox.add({
    operationId: operationId(),
    ownerUserId: localStorage.getItem(OWNER_KEY),
    entityType,
    entityId,
    operation,
    patch: operation === 'upsert' ? safePatch : {},
    createdAt: Date.now(),
    attempts: 0,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('leanna:sync-outbox-changed'));
  }
}
