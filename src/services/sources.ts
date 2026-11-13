import type { Song } from '../types/song';
import type { Category } from '../types/category';
import type { Playlist } from '../types/playlist';

/**
 * Une « source » est une liste de lecture désignée par une chaîne dans l'URL :
 * `all`, `favorites`, `recent`, `cat:<id>` ou `pl:<id>`.
 */
export const RECENT_LIMIT = 12;

export interface SourceData {
  songs: Song[];
  categories: Category[];
  playlists: Playlist[];
}

export interface ResolvedSource {
  title: string;
  songs: Song[];
}

export function sourceKey(kind: 'all' | 'favorites' | 'recent'): string;
export function sourceKey(kind: 'cat' | 'pl', id: string): string;
export function sourceKey(kind: string, id?: string): string {
  return id === undefined ? kind : `${kind}:${id}`;
}

export function resolveSource(source: string, data: SourceData): ResolvedSource | null {
  if (source === 'all') return { title: 'Toutes les chansons', songs: data.songs };
  if (source === 'favorites') return { title: 'Mes favoris', songs: data.songs.filter((s) => s.favorite) };
  if (source === 'recent') {
    const songs = data.songs
      .filter((s) => s.lastPlayedAt !== undefined)
      .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
      .slice(0, RECENT_LIMIT);
    return { title: 'Dernières écoutes', songs };
  }
  if (source.startsWith('cat:')) {
    const category = data.categories.find((c) => c.id === source.slice(4));
    if (!category) return null;
    return { title: category.title, songs: data.songs.filter((s) => s.categoryId === category.id) };
  }
  if (source.startsWith('pl:')) {
    const playlist = data.playlists.find((p) => p.id === source.slice(3));
    if (!playlist) return null;
    const byId = new Map(data.songs.map((s) => [s.id, s]));
    const songs = playlist.songIds.map((id) => byId.get(id)).filter((s): s is Song => s !== undefined);
    return { title: playlist.title, songs };
  }
  return null;
}
