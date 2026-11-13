import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { MusicPlayer } from '../components/music/MusicPlayer';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { useSettings } from '../hooks/useSettings';
import { markPlayed } from '../storage/songRepository';
import { db } from '../storage/database';
import { resolveSource } from '../services/sources';

interface NavState {
  autoplay?: boolean;
}

/**
 * Écran de lecture. La liste de lecture vient de `?list=` ; suivant/précédent restent dans cette liste.
 * La lecture ne démarre pas seule sur un premier accès : l'enfant appuie sur Lecture.
 */
export function PlayerPage() {
  const { songId = '' } = useParams();
  const [params] = useSearchParams();
  const source = params.get('list') ?? 'all';
  const location = useLocation();
  const navigate = useNavigate();
  const library = useMusicLibrary();
  const { settings } = useSettings();
  const [breakShown, setBreakShown] = useState(false);

  // Durée indicative : un message doux, jamais une coupure brutale.
  useEffect(() => {
    if (settings.maxSessionMinutes <= 0) return;
    const id = window.setTimeout(() => setBreakShown(true), settings.maxSessionMinutes * 60_000);
    return () => window.clearTimeout(id);
  }, [settings.maxSessionMinutes]);

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
      {breakShown && (
        <div className="card anim-pop" role="status" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, fontWeight: 800 }}>Une petite pause, c’est bien aussi !</span>
          <Button onClick={() => setBreakShown(false)}>Continuer</Button>
        </div>
      )}
      <MusicPlayer
        key={song.id}
        song={song}
        autoplay={autoplay}
        volume={settings.maxVolumePreference}
        fullscreenMode={settings.fullscreenMode}
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
    </AppShell>
  );
}
