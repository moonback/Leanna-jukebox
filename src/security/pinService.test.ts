import { describe, expect, it } from 'vitest';
import {
  createPinCredentials,
  lockoutDurationMs,
  registerFailure,
  validatePinFormat,
  verifyPin,
} from './pinService';

// Itérations réduites pour garder les tests rapides ; la production utilise PIN_ITERATIONS.
const FAST = 1000;

describe('validatePinFormat', () => {
  it.each([
    ['1234', null],
    ['123456', null],
    ['123', 'length'],
    ['1234567', 'length'],
    ['12a4', 'digits'],
    ['', 'length'],
  ])('%j -> %s', (pin, expected) => {
    expect(validatePinFormat(pin)).toBe(expected);
  });
});

describe('création et vérification du PIN', () => {
  it('ne stocke jamais le PIN en clair et utilise un sel', async () => {
    const credentials = await createPinCredentials('4821', FAST);
    expect(JSON.stringify(credentials)).not.toContain('4821');
    expect(credentials.pinSalt.length).toBeGreaterThan(10);
    expect(credentials.pinIterations).toBe(FAST);
  });

  it('accepte le bon PIN et refuse les mauvais', async () => {
    const credentials = await createPinCredentials('4821', FAST);
    expect(await verifyPin('4821', credentials)).toBe(true);
    expect(await verifyPin('4822', credentials)).toBe(false);
    expect(await verifyPin('482', credentials)).toBe(false);
  });

  it('deux créations avec le même PIN produisent des hash différents (sel aléatoire)', async () => {
    const a = await createPinCredentials('1111', FAST);
    const b = await createPinCredentials('1111', FAST);
    expect(a.pinSalt).not.toBe(b.pinSalt);
    expect(a.pinHash).not.toBe(b.pinHash);
  });
});

describe('temporisation après échecs', () => {
  it('pas de blocage avant 3 échecs', () => {
    expect(lockoutDurationMs(2)).toBe(0);
  });

  it('blocage croissant : 30 s, 5 min, 15 min', () => {
    expect(lockoutDurationMs(3)).toBe(30_000);
    expect(lockoutDurationMs(5)).toBe(5 * 60_000);
    expect(lockoutDurationMs(8)).toBe(15 * 60_000);
    expect(lockoutDurationMs(20)).toBe(15 * 60_000);
  });

  it('registerFailure incrémente le compteur et fixe la date de fin de blocage', () => {
    const now = 1_000_000;
    let state = { failedAttempts: 0, lockedUntil: 0 };
    state = registerFailure(state, now);
    expect(state).toEqual({ failedAttempts: 1, lockedUntil: 0 });
    state = registerFailure(state, now);
    state = registerFailure(state, now);
    expect(state).toEqual({ failedAttempts: 3, lockedUntil: now + 30_000 });
  });
});
