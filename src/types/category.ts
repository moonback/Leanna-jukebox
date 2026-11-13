import type { IllustrationKey } from '../illustrations/illustrationKeys';

export interface Category {
  id: string;
  title: string;
  illustration: IllustrationKey;
  sortOrder: number;
}
