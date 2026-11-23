/** Réglages parents, stockés dans IndexedDB (table `settings`, clé `parent`). */
export interface ParentSettings {
  key: 'parent';
  /** Hash PBKDF2 du PIN, encodé en base64. Absent tant que le PIN n'est pas créé. */
  pinHash?: string;
  /** Sel aléatoire de 16 octets, encodé en base64. */
  pinSalt?: string;
  pinIterations?: number;
  /** Tentatives incorrectes consécutives, persistées pour survivre à un rechargement. */
  failedAttempts: number;
  /** Timestamp (ms) avant lequel la saisie du PIN est refusée. */
  lockedUntil: number;
  /** Durée indicative d'écoute en minutes (0 = désactivée). */
  maxSessionMinutes: number;
  /** Volume maximal souhaité, de 0 à 100 (limité aussi par le volume Android). */
  maxVolumePreference: number;
  /** Mode enfant : l'accès parent exige un appui long de 2 secondes. */
  childMode: boolean;
  /** Sons d'interface, désactivés par défaut. */
  soundsEnabled: boolean;
  /** Passe le lecteur en plein écran au lancement d'une chanson (action explicite requise). */
  fullscreenMode: boolean;
  /** Affiche l'espace vidéos dans l'interface enfant (désactivé par défaut). */
  videosEnabled: boolean;
  schemaVersion: number;
}

export const CURRENT_SCHEMA_VERSION = 1;
