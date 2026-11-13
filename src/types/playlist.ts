import type { IllustrationKey } from '../illustrations/illustrationKeys';

export interface Playlist {
  id: string;
  title: string;
  illustration: IllustrationKey;
  songIds: string[];
  sortOrder: number;
  createdAt: number;
}
