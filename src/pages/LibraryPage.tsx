import { Link } from 'react-router-dom';
import { ChevronLeft, Heart, Clock, Music } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { CategoryCard } from '../components/music/CategoryCard';
import { PlaylistCard } from '../components/music/PlaylistCard';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { sourceKey } from '../services/sources';

/** Bibliothèque : toutes les chansons, favoris, dernières écoutes, playlists et catégories. */
export function LibraryPage() {
  const library = useMusicLibrary();

  const shortcuts = [
    { to: `/list/${encodeURIComponent(sourceKey('all'))}`, label: 'Toutes', icon: Music, count: library.songs.length },
    { to: `/list/${encodeURIComponent('favorites')}`, label: 'Favoris', icon: Heart, count: library.favorites.length },
    { to: `/list/${encodeURIComponent('recent')}`, label: 'Dernières', icon: Clock, count: library.recent.length },
  ];

  return (
    <AppShell>
      <header className="row-wrap" style={{ gap: 12 }}>
        <Link to="/" aria-label="Retour à l’accueil" className="btn btn--secondary btn--icon" style={{ textDecoration: 'none' }}>
          <ChevronLeft size={28} />
        </Link>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 900 }}>Bibliothèque</h1>
      </header>

      {!library.ready ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid-tiles" style={{ marginTop: 16 }}>
            {shortcuts.map(({ to, label, icon: Icon, count }) => (
              <Link key={to} to={to} className="glass" aria-label={label} style={{ display: 'grid', placeItems: 'center', gap: 6, padding: 16, textDecoration: 'none', color: 'inherit' }}>
                <Icon size={34} aria-hidden="true" />
                <span style={{ fontWeight: 900 }}>{label}</span>
                <span className="muted">{count}</span>
              </Link>
            ))}
          </div>

          <h2 className="section-title">Playlists</h2>
          {library.playlists.length === 0 ? (
            <EmptyState illustration="rainbow" title="Pas encore de playlist" description="Les parents peuvent créer des playlists, par exemple « Pour danser »." />
          ) : (
            <div className="grid-tiles">
              {library.playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} count={playlist.songIds.length} />
              ))}
            </div>
          )}

          <h2 className="section-title">Catégories</h2>
          <div className="grid-tiles">
            {library.categories.map((category) => (
              <CategoryCard key={category.id} category={category} count={library.songs.filter((s) => s.categoryId === category.id).length} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
