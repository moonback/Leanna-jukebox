import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Illustration } from '../../illustrations/Illustration';
import { useNowPlaying } from '../../services/nowPlaying';
import { playUiSound } from '../../services/sound';
import type { Song } from '../../types/song';

interface SongCardProps {
  song: Song;
  /** Liste d'origine (ex. `all`, `cat:…`) pour que suivant/précédent restent dans la même liste. */
  source: string;
  soundsEnabled?: boolean;
}

/** Carte chanson : illustration, nom, grand bouton lecture et indicateur de lecture en cours. */
export const SongCard = memo(function SongCard({ song, source, soundsEnabled = false }: SongCardProps) {
  const nowPlaying = useNowPlaying();
  const isPlaying = nowPlaying === song.id;
  const to = `/play/${encodeURIComponent(song.id)}?list=${encodeURIComponent(source)}`;

  return (
    <Link
      to={to}
      className="glass song-card"
      aria-label={`Écouter ${song.title}`}
      onClick={() => playUiSound(soundsEnabled)}
      style={{
        display: 'grid',
        gap: 10,
        padding: 14,
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative',
        minWidth: 0,
        background: isPlaying ? 'var(--color-surface-strong)' : undefined,
        outline: isPlaying ? '3px solid var(--color-lavender-deep)' : 'none',
        transition: 'transform 0.18s ease',
      }}
    >
      <div style={{ position: 'relative', background: '#fff', borderRadius: 20, padding: 8, aspectRatio: '1', display: 'grid' }}>
        <Illustration name={song.illustration} className={isPlaying ? 'anim-float' : ''} style={{ width: '100%', height: '100%' }} />
        {isPlaying && (
          <span
            className="equalizer"
            aria-label="En cours de lecture"
            style={{ position: 'absolute', top: 8, left: 8, color: 'var(--color-pink-deep)' }}
          >
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: '1.05rem', overflowWrap: 'anywhere', lineHeight: 1.2 }}>
          {song.title}
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            minWidth: 56,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, #ff9eb9, #c9a6ff)',
            color: '#fff',
            boxShadow: 'var(--shadow-press)',
          }}
        >
          <Play size={26} fill="currentColor" />
        </span>
      </div>
    </Link>
  );
});
