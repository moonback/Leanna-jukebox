import { useMemo } from 'react';
import { useMusicLibrary } from './useMusicLibrary';
import type { Playlist } from '../types/playlist';
import type { Song } from '../types/song';

/** Retourne une playlist avec ses chansons dans l'ordre enregistré (les chansons supprimées sont ignorées). */
export function usePlaylistSongs(playlistId: string | undefined): { playlist: Playlist | undefined; songs: Song[]; ready: boolean } {
  const library = useMusicLibrary();
  const playlist = library.playlists.find((p) => p.id === playlistId);
  const songs = useMemo(() => {
    if (!playlist) return [];
    const byId = new Map(library.songs.map((s) => [s.id, s]));
    return playlist.songIds.map((id) => byId.get(id)).filter((s): s is Song => s !== undefined);
  }, [playlist, library.songs]);
  return { playlist, songs, ready: library.ready };
}
