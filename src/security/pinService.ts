import type { ParentSettings } from '../types/settings';

/** Nombre d'itérations PBKDF2-SHA256 pour les nouveaux PIN. Tests : valeur plus basse via paramètre. */
export const PIN_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export type PinFormatError = 'length' | 'digits';

/** Un PIN parental est composé de 4 à 6 chiffres. */
export function validatePinFormat(pin: string): PinFormatError | null {
  if (pin.length < 4 || pin.length > 6) return 'length';
  if (!/^\d+$/.test(pin)) return 'digits';
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function randomSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return salt;
}

export async function derivePinHash(pin: string, salt: Uint8Array, iterations = PIN_ITERATIONS): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    HASH_BITS,
  );
  return toBase64(new Uint8Array(bits));
}

export interface PinCredentials {
  pinHash: string;
  pinSalt: string;
  pinIterations: number;
}

/** Crée les identifiants (hash + sel) à partir d'un PIN déjà validé. */
export async function createPinCredentials(pin: string, iterations = PIN_ITERATIONS): Promise<PinCredentials> {
  const salt = randomSalt();
  return {
    pinHash: await derivePinHash(pin, salt, iterations),
    pinSalt: toBase64(salt),
    pinIterations: iterations,
  };
}

/** Vérifie un PIN contre les identifiants stockés. Comparaison à temps constant. */
export async function verifyPin(pin: string, credentials: PinCredentials): Promise<boolean> {
  const candidate = await derivePinHash(pin, fromBase64(credentials.pinSalt), credentials.pinIterations);
  const a = fromBase64(candidate);
  const b = fromBase64(credentials.pinHash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export const LOCKOUT_STEPS: ReadonlyArray<{ attempts: number; lockMs: number }> = [
  { attempts: 3, lockMs: 30_000 },
  { attempts: 5, lockMs: 5 * 60_000 },
  { attempts: 8, lockMs: 15 * 60_000 },
];

/** Durée de blocage après un nombre donné d'échecs consécutifs (0 = aucun blocage). */
export function lockoutDurationMs(failedAttempts: number): number {
  let duration = 0;
  for (const step of LOCKOUT_STEPS) {
    if (failedAttempts >= step.attempts) duration = step.lockMs;
  }
  return duration;
}

export function isLocked(settings: Pick<ParentSettings, 'lockedUntil'>, now: number): boolean {
  return settings.lockedUntil > now;
}

/** Nouvel état après un échec de saisie : compteur incrémenté et blocage éventuel. */
export function registerFailure(
  settings: Pick<ParentSettings, 'failedAttempts' | 'lockedUntil'>,
  now: number,
): Pick<ParentSettings, 'failedAttempts' | 'lockedUntil'> {
  const failedAttempts = settings.failedAttempts + 1;
  const duration = lockoutDurationMs(failedAttempts);
  return { failedAttempts, lockedUntil: duration > 0 ? now + duration : 0 };
}
