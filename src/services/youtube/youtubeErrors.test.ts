import { describe, expect, it } from 'vitest';
import { describePlayerError } from './youtubeErrors';

describe('describePlayerError', () => {
  it('signale l’absence de réseau avec un message d’enfant et permet de réessayer', () => {
    const message = describePlayerError(null, true);
    expect(message.childMessage).toMatch(/pas de réseau/i);
    expect(message.retryable).toBe(true);
  });

  it.each([
    [100, false],
    [101, false],
    [150, false],
    [153, false],
    [2, false],
  ])('code %i : message dédié, non réessayable', (code, retryable) => {
    const message = describePlayerError(code);
    expect(message.childMessage.length).toBeGreaterThan(10);
    expect(message.parentHint.length).toBeGreaterThan(10);
    expect(message.retryable).toBe(retryable);
  });

  it('distingue vidéo supprimée (100) et lecture interdite (101/150)', () => {
    expect(describePlayerError(100).parentHint).toMatch(/supprimée|privée/i);
    expect(describePlayerError(101).parentHint).toMatch(/interdit/i);
    expect(describePlayerError(150).parentHint).toMatch(/interdit/i);
  });

  it('traite un code inconnu sans planter', () => {
    const message = describePlayerError(999);
    expect(message.retryable).toBe(true);
    expect(message.parentHint).toContain('999');
  });
});
