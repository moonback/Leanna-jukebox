import type { JukeboxDatabase, SyncEntityType } from './database';

const DEVICE_ONLY_SETTINGS = new Set(['pinHash', 'pinSalt', 'pinIterations', 'failedAttempts', 'lockedUntil']);

function operationId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `op-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
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
    entityType,
    entityId,
    operation,
    patch: operation === 'upsert' ? safePatch : {},
    createdAt: Date.now(),
    attempts: 0,
  });
}
