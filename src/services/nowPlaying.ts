import { useSyncExternalStore } from 'react';

/** Chanson en cours de lecture, partagée entre le lecteur et les cartes (indicateur animé). */
let current: string | null = null;
const listeners = new Set<() => void>();

export function setNowPlaying(songId: string | null): void {
  if (current === songId) return;
  current = songId;
  listeners.forEach((listener) => listener());
}

export function getNowPlaying(): string | null {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNowPlaying(): string | null {
  return useSyncExternalStore(subscribe, getNowPlaying, getNowPlaying);
}
