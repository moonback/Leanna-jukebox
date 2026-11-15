import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JukeboxDatabase } from '../storage/database';
import { recordGameRound } from './gameProgress';

let database: JukeboxDatabase;

beforeEach(() => {
  database = new JukeboxDatabase(`game-progress-${Math.random().toString(36).slice(2)}`);
  localStorage.setItem('leanna-cloud-owner', 'family-a');
});

afterEach(async () => {
  database.close();
  await database.delete();
  localStorage.removeItem('leanna-cloud-owner');
});

describe('progression des jeux', () => {
  it('incrémente les manches et ajoute une opération rejouable à la file', async () => {
    await recordGameRound('memoire', database, 100);
    await recordGameRound('memoire', database, 200);

    expect(await database.gameProgress.get('memoire')).toEqual({
      gameId: 'memoire', completedRounds: 2, lastPlayedAt: 200, updatedAt: 200,
    });
    const operations = await database.syncOutbox.toArray();
    expect(operations).toHaveLength(2);
    expect(operations.every((operation) => operation.entityType === 'game_progress')).toBe(true);
    expect(operations.every((operation) => operation.ownerUserId === 'family-a')).toBe(true);
  });
});
