import { useCallback } from 'react';
import { getSettings, updateSettings } from '../storage/settingsRepository';
import { createPinCredentials, isLocked, registerFailure, validatePinFormat, verifyPin } from '../security/pinService';
import { AppError } from '../services/errors';
import { useSettings } from './useSettings';

export type UnlockResult =
  | { status: 'ok' }
  | { status: 'wrong'; failedAttempts: number; lockedUntil: number }
  | { status: 'locked'; lockedUntil: number };

/** Authentification de l'espace parents : création du PIN, déverrouillage, temporisation persistée. */
export function useParentAuth() {
  const { settings, loaded } = useSettings();
  const hasPin = Boolean(settings.pinHash && settings.pinSalt);

  const createPin = useCallback(async (pin: string) => {
    const format = validatePinFormat(pin);
    if (format === 'digits') throw new AppError('validation', 'Le code PIN ne contient que des chiffres.');
    if (format === 'length') throw new AppError('validation', 'Le code PIN doit contenir entre 4 et 6 chiffres.');
    const credentials = await createPinCredentials(pin);
    await updateSettings({ ...credentials, failedAttempts: 0, lockedUntil: 0 });
  }, []);

  const unlock = useCallback(async (pin: string): Promise<UnlockResult> => {
    const current = await getSettings();
    const now = Date.now();
    if (isLocked(current, now)) return { status: 'locked', lockedUntil: current.lockedUntil };
    if (!current.pinHash || !current.pinSalt) throw new AppError('validation', 'Aucun code PIN n’est encore créé.');

    const ok = await verifyPin(pin, {
      pinHash: current.pinHash,
      pinSalt: current.pinSalt,
      pinIterations: current.pinIterations ?? 200_000,
    });
    if (ok) {
      await updateSettings({ failedAttempts: 0, lockedUntil: 0 });
      return { status: 'ok' };
    }
    const next = registerFailure(current, now);
    await updateSettings(next);
    return next.lockedUntil > now
      ? { status: 'locked', lockedUntil: next.lockedUntil }
      : { status: 'wrong', failedAttempts: next.failedAttempts, lockedUntil: next.lockedUntil };
  }, []);

  return { hasPin, loaded, lockedUntil: settings.lockedUntil, failedAttempts: settings.failedAttempts, createPin, unlock };
}
