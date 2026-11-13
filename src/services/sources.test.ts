import { describe, expect, it } from 'vitest';
import { resolveSource, sourceKey, RECENT_LIMIT } from './sources';
import type { Song } from '../types/song';

const song = (id: string, patch: Partial<Song> = {}): Song => ({
  id,
  title: id,
  youtubeVideoId: 'dQw4w9WgXcQ',
  categoryId: 'c1',
  illustration: 'bear',
  favorite: false,
  sortOrder: Number(id.replace(/\D/g, '')) || 0,
  createdAt: 0,
  updatedAt: 0,
  ...patch,
});

const data = {
  songs: [
    song('s1', { favorite: true, categoryId: 'c1', lastPlayedAt: 100 }),
    song('s2', { categoryId: 'c2', lastPlayedAt: 300 }),
    song('s3', { categoryId: 'c1' }),
  ],
  categories: [
    { id: 'c1', title: 'Comptines', illustration: 'note' as const, sortOrder: 0 },
    { id: 'c2', title: 'Danse', illustration: 'sun' as const, sortOrder: 1 },
  ],
  playlists: [{ id: 'p1', title: 'Pour danser', illustration: 'star' as const, songIds: ['s2', 'fantome', 's1'], sortOrder: 0, createdAt: 0 }],
};

describe('resolveSource', () => {
  it('toutes les chansons, favoris, dernières écoutes', () => {
    expect(resolveSource('all', data)?.songs).toHaveLength(3);
    expect(resolveSource('favorites', data)?.songs.map((s) => s.id)).toEqual(['s1']);
    expect(resolveSource('recent', data)?.songs.map((s) => s.id)).toEqual(['s2', 's1']);
  });

  it('catégorie : seulement ses chansons', () => {
    expect(resolveSource(sourceKey('cat', 'c1'), data)?.songs.map((s) => s.id)).toEqual(['s1', 's3']);
  });

  it('playlist : ordre enregistré, chansons supprimées ignorées', () => {
    const resolved = resolveSource(sourceKey('pl', 'p1'), data);
    expect(resolved?.title).toBe('Pour danser');
    expect(resolved?.songs.map((s) => s.id)).toEqual(['s2', 's1']);
  });

  it('source inconnue ou identifiant absent : null', () => {
    expect(resolveSource('n’importe-quoi', data)).toBeNull();
    expect(resolveSource(sourceKey('cat', 'absente'), data)).toBeNull();
    expect(resolveSource(sourceKey('pl', 'absente'), data)).toBeNull();
  });

  it('limite les dernières écoutes', () => {
    const many = Array.from({ length: RECENT_LIMIT + 5 }, (_, i) => song(`s${i}`, { lastPlayedAt: i }));
    expect(resolveSource('recent', { ...data, songs: many })?.songs).toHaveLength(RECENT_LIMIT);
  });
});
