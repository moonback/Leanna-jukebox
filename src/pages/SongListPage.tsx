import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { SongGrid } from '../components/music/SongGrid';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { useSettings } from '../hooks/useSettings';
import { resolveSource } from '../services/sources';

/** Liste de chansons d'une source : favoris, dernières écoutes, catégorie ou playlist. */
export function SongListPage() {
  const { source = 'all' } = useParams();
  const library = useMusicLibrary();
  const { settings } = useSettings();
  const resolved = library.ready
    ? resolveSource(source, { songs: library.songs, categories: library.categories, playlists: library.playlists })
    : null;

  return (
    <AppShell>
      <header className="row-wrap" style={{ gap: 12 }}>
        <Link to="/library" aria-label="Retour à la bibliothèque" className="btn btn--secondary btn--icon" style={{ textDecoration: 'none' }}>
          <ChevronLeft size={28} />
        </Link>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 900, overflowWrap: 'anywhere' }}>
          {resolved?.title ?? ''}
        </h1>
      </header>
      <div style={{ marginTop: 18 }}>
        {!library.ready && <LoadingState />}
        {library.ready && !resolved && (
          <EmptyState illustration="cloud" title="Cette liste n’existe plus" description="Elle a peut-être été supprimée." />
        )}
        {resolved && (
          <SongGrid
            songs={resolved.songs}
            source={source}
            soundsEnabled={settings.soundsEnabled}
            emptyTitle="Rien à écouter ici pour le moment"
            emptyDescription="Les chansons apparaîtront ici dès qu’elles seront ajoutées."
          />
        )}
      </div>
    </AppShell>
  );
}
