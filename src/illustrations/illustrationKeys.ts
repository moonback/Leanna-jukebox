export const ILLUSTRATION_KEYS = [
  'bear',
  'bunny',
  'fox',
  'cat',
  'panda',
  'star',
  'cloud',
  'rainbow',
  'note',
  'sun',
] as const;

export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number];

export function isIllustrationKey(value: unknown): value is IllustrationKey {
  return typeof value === 'string' && (ILLUSTRATION_KEYS as readonly string[]).includes(value);
}
