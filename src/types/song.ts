import type { IllustrationKey } from '../illustrations/illustrationKeys';

export interface Song {
  id: string;
  title: string;
  /** Identifiant vidéo YouTube (11 caractères). Vide pour les chansons de démonstration. */
  youtubeVideoId: string;
  categoryId: string;
  illustration: IllustrationKey;
  /** Stocké hors index : IndexedDB n'indexe pas les booléens. */
  favorite: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  /** Date de la dernière lecture, pour « Dernières chansons écoutées ». */
  lastPlayedAt?: number;
  /** Chanson fictive fournie pour la démonstration : elle n'est jamais présentée comme jouable. */
  isDemo?: boolean;
}

export type SongInput = Pick<Song, 'title' | 'youtubeVideoId' | 'categoryId' | 'illustration'> &
  Partial<Pick<Song, 'favorite' | 'isDemo'>>;
