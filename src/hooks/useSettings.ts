import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../storage/database';
import { defaultSettings } from '../storage/seed';
import type { ParentSettings } from '../types/settings';

/** Réglages parents en direct (volume maximal, mode enfant, plein écran…). */
export function useSettings(): { settings: ParentSettings; loaded: boolean } {
  const stored = useLiveQuery(() => db.settings.get('parent'), [], undefined);
  return { settings: stored ?? defaultSettings(), loaded: stored !== undefined };
}
