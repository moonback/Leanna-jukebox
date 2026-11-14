import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useNowPlaying } from '../../services/nowPlaying';
import { playUiSound } from '../../services/sound';
import type { Song } from '../../types/song';

interface SongCardProps {
  song: Song;
  /** Liste d'origine pour conserver la même file suivant/précédent. */
  source: string;
  soundsEnabled?: boolean;
}

/** Tuile enfant minimaliste : miniature YouTube et bouton lecture, sans titre ni décoration supplémentaire. */
export const SongCard = memo(function SongCard({ song, source, soundsEnabled = false }: SongCardProps) {
  const nowPlaying = useNowPlaying();
  const isPlaying = nowPlaying === song.id;
  const to = `/play/${encodeURIComponent(song.id)}?list=${encodeURIComponent(source)}`;
  const thumbnail = song.youtubeVideoId
    ? `https://img.youtube.com/vi/${encodeURIComponent(song.youtubeVideoId)}/hqdefault.jpg`
    : '';

  return (
    <Link
      to={to}
      className={`glass song-card song-card--thumbnail${isPlaying ? ' song-card--playing' : ''}`}
      aria-label={`Lire la vidéo : ${song.title}`}
      title={song.title}
      onClick={() => playUiSound(soundsEnabled)}
    >
      {thumbnail ? (
        <img
          className="song-card__thumbnail"
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="song-card__missing" aria-hidden="true">
          <Play size={30} fill="currentColor" />
        </span>
      )}
      <span className="song-card__play" aria-hidden="true">
        <Play size={25} fill="currentColor" />
      </span>
      {isPlaying && <span className="song-card__playing-indicator" aria-label="En cours de lecture" />}
    </Link>
  );
});
