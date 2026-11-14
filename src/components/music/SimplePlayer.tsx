import { X, RotateCw, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { Button } from '../ui/Button';
import type { Song } from '../../types/song';

interface SimplePlayerProps {
  song: Song;
  volume: number;
  onStarted: (songId: string) => void;
  onEnded: () => void;
  onClose: () => void;
  /** Absent quand il n'y a pas de chanson précédente / suivante : le bouton est alors désactivé. */
  onPrevious?: () => void;
  onNext?: () => void;
}

/**
 * Petit lecteur du mode simple : la vidéo est affichée en petit et lancée automatiquement.
 * Le composant est recréé pour chaque chanson (key côté parent), ce qui évite les états mélangés.
 */
export function SimplePlayer({ song, volume, onStarted, onEnded, onClose, onPrevious, onNext }: SimplePlayerProps) {
  const { hostRef, state, retry } = usePlayer({
    songId: song.id,
    videoId: song.youtubeVideoId,
    autoplay: true,
    volume,
    onStarted,
    onEnded,
  });

  const hasError = state.status === 'error' && state.error !== undefined;

  return (
    <section className="glass" aria-label="Lecteur simple" style={{ padding: 12, display: 'grid', gap: 10, justifyItems: 'center', animation: 'simple-pop-in 0.35s ease' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', background: '#2b2238' }}>
        {state.status === 'demo' ? (
          <p style={{ position: 'absolute', inset: 0, margin: 0, display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center', color: '#fff', fontWeight: 800 }}>
            Chanson d’exemple : pas encore de vidéo.
          </p>
        ) : (
          <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
        )}
        {state.status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(43,34,56,0.6)' }}>
            <div className="spinner" aria-label="Chargement" />
          </div>
        )}
      </div>

      {hasError && state.error && (
        <div role="alert" style={{ textAlign: 'center', display: 'grid', gap: 10, justifyItems: 'center' }}>
          <p style={{ margin: 0, fontWeight: 800 }}>{state.error.childMessage}</p>
          {state.error.retryable && (
            <Button onClick={retry} icon={<RotateCw size={20} />}>
              Réessayer
            </Button>
          )}
        </div>
      )}

      <div className="row-wrap" style={{ justifyContent: 'center' }}>
        <Button size="icon" label="Chanson précédente" onClick={onPrevious} disabled={!onPrevious} icon={<SkipBack size={26} />} />
        <Button size="icon" label="Fermer le lecteur" onClick={onClose} icon={<X size={26} />} />
        <Button size="icon" label="Chanson suivante" onClick={onNext} disabled={!onNext} icon={<SkipForward size={26} />} />
      </div>
    </section>
  );
}
