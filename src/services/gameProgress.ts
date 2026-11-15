import { db as defaultDb, type JukeboxDatabase } from '../storage/database';
import { enqueueSyncOperation } from '../storage/syncOutbox';

/** Enregistre une manche réussie localement ; elle sera envoyée dès que le réseau revient. */
export async function recordGameRound(gameId: string, database: JukeboxDatabase = defaultDb, now = Date.now()): Promise<void> {
  await database.transaction('rw', database.gameProgress, database.syncOutbox, async () => {
    const current = await database.gameProgress.get(gameId);
    const next = {
      gameId,
      completedRounds: (current?.completedRounds ?? 0) + 1,
      lastPlayedAt: now,
      updatedAt: now,
    };
    await database.gameProgress.put(next);
    await enqueueSyncOperation(database, 'game_progress', gameId, 'upsert', next);
  });
}
