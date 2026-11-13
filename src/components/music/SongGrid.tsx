import type { Song } from '../../types/song';
import { SongCard } from './SongCard';
import { EmptyState } from '../ui/EmptyState';

interface SongGridProps {
  songs: Song[];
  source: string;
  soundsEnabled?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function SongGrid({ songs, source, soundsEnabled, emptyTitle = 'Pas encore de chansons', emptyDescription }: SongGridProps) {
  if (songs.length === 0) {
    return <EmptyState illustration="note" title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="grid-songs">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} source={source} soundsEnabled={soundsEnabled} />
      ))}
    </div>
  );
}
