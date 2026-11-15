import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { MusicPlayer } from '../components/music/MusicPlayer';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { ParentGate } from '../components/parental/ParentGate';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { useSettings } from '../hooks/useSettings';
import { markPlayed } from '../storage/songRepository';
import { db } from '../storage/database';
import { resolveSource } from '../services/sources';

interface NavState {
  autoplay?: boolean;
}

/** Écran de lecture avec vraie fin de session : pause, écran de repos et reprise par PIN parental. */
export function PlayerPage() {
  const { songId = '' } = useParams();
  const [params] = useSearchParams();
  const source = params.get('list') ?? 'all';
  const location = useLocation();
  const navigate = useNavigate();
  const library = useMusicLibrary();
  const { settings } = useSettings();
  const [breakShown, setBreakShown] = useState(false);
  const [breakCycle, setBreakCycle] = useState(0);

  useEffect(() => {
    if (settings.maxSessionMinutes <= 0) return;
    const id = window.setTimeout(() => setBreakShown(true), settings.maxSessionMinutes * 60_000);
    return () => window.clearTimeout(id);
  }, [settings.maxSessionMinutes, breakCycle]);

  if (!library.ready) return <AppShell><LoadingState /></AppShell>;

  const queue = resolveSource(source, { songs: library.songs, categories: library.categories, playlists: library.playlists })?.songs ?? library.songs;
  const index = queue.findIndex((s) => s.id === songId);
  const song = index >= 0 ? queue[index] : library.songs.find((s) => s.id === songId);
  const autoplay = Boolean((location.state as NavState | null)?.autoplay);

  if (!song) {
    return (
      <AppShell>
        <EmptyState illustration="cloud" title="Cette chanson n’existe plus" action={<Button variant="primary" onClick={() => navigate('/')}>Retour à l’accueil</Button>} />
      </AppShell>
    );
  }

  const goTo = (targetIndex: number) => {
    const target = queue[targetIndex];
    if (!target) return;
    navigate(`/play/${encodeURIComponent(target.id)}?list=${encodeURIComponent(source)}`, { state: { autoplay: true } });
  };

  return (
    <AppShell variant="player" showNavigation={false}>
      <MusicPlayer
        key={song.id}
        song={song}
        autoplay={autoplay}
        volume={settings.maxVolumePreference}
        fullscreenMode={settings.fullscreenMode}
        forcePaused={breakShown}
        hasPrevious={index > 0}
        hasNext={index >= 0 && index < queue.length - 1}
        onPrevious={() => goTo(index - 1)}
        onNext={() => goTo(index + 1)}
        onBack={() => navigate(-1)}
        onStarted={(id) => {
          void markPlayed(id, db);
        }}
        onEnded={() => {
          if (index >= 0 && index < queue.length - 1) goTo(index + 1);
        }}
      />
      {breakShown && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-break-title"
          className="session-break-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 900, display: 'grid', placeItems: 'center',
            padding: 20, background: 'rgba(35, 29, 48, .78)', backdropFilter: 'blur(10px)',
          }}
        >
          <section className="card stack" style={{ width: 'min(480px, 100%)', maxHeight: '90dvh', overflowY: 'auto', textAlign: 'center' }}>
            <div aria-hidden="true" style={{ fontSize: '3.5rem' }}>🌙 🐱</div>
            <h2 id="session-break-title" style={{ margin: 0 }}>C’est l’heure d’une petite pause !</h2>
            <p className="muted" style={{ margin: 0 }}>La musique est en pause. Demande à un parent de saisir son code pour reprendre.</p>
            <ParentGate allowReset={false}>
              <div className="stack" style={{ alignItems: 'center' }}>
                <p style={{ margin: 0, fontWeight: 800 }}>Tu peux reprendre quand ton parent est prêt.</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setBreakShown(false);
                    setBreakCycle((cycle) => cycle + 1);
                  }}
                >
                  Reprendre la musique
                </Button>
                <Button variant="secondary" onClick={() => navigate('/')}>Terminer et retourner à l’accueil</Button>
              </div>
            </ParentGate>
          </section>
        </div>
      )}
    </AppShell>
  );
}
