import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Maximize, Pause, Play, SkipBack, SkipForward, RotateCw } from 'lucide-react';
import { Illustration } from '../../illustrations/Illustration';
import { usePlayer } from '../../hooks/usePlayer';
import { Button } from '../ui/Button';
import type { Song } from '../../types/song';

interface MusicPlayerProps {
  song: Song;
  autoplay: boolean;
  volume: number;
  fullscreenMode: boolean;
  forcePaused?: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onBack: () => void;
  onStarted: (songId: string) => void;
  onEnded: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Lecteur : vidéo officielle YouTube, commandes à l'extérieur de l'iframe, aucune superposition. */
export function MusicPlayer(props: MusicPlayerProps) {
  const { song, autoplay, volume, fullscreenMode, forcePaused = false, hasPrevious, hasNext, onPrevious, onNext, onBack, onStarted, onEnded } = props;
  const frameRef = useRef<HTMLDivElement>(null);
  const [fullscreenError, setFullscreenError] = useState(false);
  const { hostRef, state, play, pause, retry } = usePlayer({
    songId: song.id,
    videoId: song.youtubeVideoId,
    autoplay,
    volume,
    onStarted,
    onEnded,
  });

  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  const isPlaying = state.status === 'playing';
  const progress = state.duration > 0 ? Math.min(100, (state.currentTime / state.duration) * 100) : 0;
  const hasError = state.status === 'error' && state.error !== undefined;

  useEffect(() => {
    if (forcePaused && isPlaying) pauseRef.current();
  }, [forcePaused, isPlaying]);

  const goFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frameRef.current?.requestFullscreen();
      setFullscreenError(false);
    } catch {
      setFullscreenError(true);
    }
  };

  return (
    <section className="stack" aria-label="Lecteur musical">
      <header className="row-wrap" style={{ justifyContent: 'space-between' }}>
        <Button variant="secondary" size="icon" label="Retour à la bibliothèque" onClick={onBack} icon={<ChevronLeft size={28} />} />
        <h1 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', overflowWrap: 'anywhere', textAlign: 'center' }}>
          {song.title}
        </h1>
        <div style={{ width: 56 }} aria-hidden="true">
          <Illustration name={song.illustration} style={{ width: 56, height: 56 }} />
        </div>
      </header>

      <div ref={frameRef} className="glass" style={{ padding: 8, borderRadius: 'var(--radius-lg)', background: '#000' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', background: '#2b2238' }}>
          {state.status === 'demo' ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#fff' }}>
              <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                <Illustration name={song.illustration} style={{ width: 120, height: 120 }} />
                <p style={{ margin: 0, fontWeight: 800 }}>Chanson d’exemple : elle n’a pas encore de vidéo.</p>
                <p style={{ margin: 0, opacity: 0.85 }}>Un parent peut la remplacer par un vrai lien YouTube.</p>
              </div>
            </div>
          ) : (
            <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
          )}
          {state.status === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(43,34,56,0.6)', color: '#fff' }}>
              <div className="spinner" aria-label="Chargement" />
            </div>
          )}
        </div>
      </div>

      {hasError && state.error && (
        <div className="card anim-pop" role="alert" style={{ textAlign: 'center', display: 'grid', gap: 12, justifyItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{state.error.childMessage}</p>
          <div className="row-wrap" style={{ justifyContent: 'center' }}>
            {state.error.retryable && (
              <Button variant="secondary" onClick={retry} icon={<RotateCw size={20} />}>Réessayer</Button>
            )}
            <Button variant="primary" onClick={onBack}>Retour à la bibliothèque</Button>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem' }}>{state.error.parentHint}</p>
        </div>
      )}

      <div aria-label="Progression" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} style={{ height: 10, borderRadius: 999, background: '#fff', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #ff9eb9, #c9a6ff)', transition: 'width 0.4s linear' }} />
      </div>
      <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
        {state.duration > 0 ? `${formatTime(state.currentTime)} / ${formatTime(state.duration)}` : ' '}
      </p>

      <div className="row-wrap" style={{ justifyContent: 'center', gap: 20 }}>
        <Button size="xxl" label="Chanson précédente" disabled={!hasPrevious || forcePaused} onClick={onPrevious} icon={<SkipBack size={34} />} />
        {isPlaying ? (
          <Button size="xxl" variant="primary" label="Pause" onClick={pause} icon={<Pause size={40} fill="currentColor" />} />
        ) : (
          <Button
            size="xxl"
            variant="primary"
            label="Lecture"
            disabled={forcePaused || state.status === 'demo' || state.status === 'loading' || hasError}
            onClick={() => {
              if (fullscreenMode && !document.fullscreenElement) void goFullscreen();
              play();
            }}
            icon={<Play size={40} fill="currentColor" />}
          />
        )}
        <Button size="xxl" label="Chanson suivante" disabled={!hasNext || forcePaused} onClick={onNext} icon={<SkipForward size={34} />} />
        <Button size="icon" label="Plein écran" disabled={forcePaused} onClick={goFullscreen} icon={<Maximize size={26} />} />
      </div>
      {fullscreenError && <p className="error-text" style={{ textAlign: 'center' }}>Le plein écran n’est pas disponible sur cet appareil.</p>}
    </section>
  );
}
