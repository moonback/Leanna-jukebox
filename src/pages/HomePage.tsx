import { Link } from 'react-router-dom';
import { Heart, ListMusic, Clock, Smile } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { CategoryCard } from '../components/music/CategoryCard';
import { SongGrid } from '../components/music/SongGrid';
import { ParentAccessButton } from '../components/parental/ParentAccessButton';
import { Illustration } from '../illustrations/Illustration';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { useMusicLibrary } from '../hooks/useMusicLibrary';
import { useSettings } from '../hooks/useSettings';

const TILES = [
  { to: '/list/favorites', label: 'Favoris', icon: Heart, color: '#ffc2d6' },
  { to: '/library', label: 'Playlists', icon: ListMusic, color: '#d9ccf6' },
  { to: '/list/recent', label: 'Dernières', icon: Clock, color: '#cfe8ff' },
  { to: '/simple', label: 'Simple', icon: Smile, color: '#c8f2e0' },
] as const;

/** Accueil enfant : écran principal, sans texte inutile, cartes illustrées et grandes cibles. */
export function HomePage() {
  const library = useMusicLibrary();
  const { settings } = useSettings();

  return (
    <AppShell>
      <header className="row-wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="row-wrap" style={{ gap: 14 }}>
          <Illustration name="cat" className="anim-float brand-mascot" style={{ width: 76, height: 76 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 900, lineHeight: 1.05 }}>Leanna Jukebox</h1>
            <p className="muted" style={{ margin: 0 }}>Le petit monde musical de Leanna</p>
          </div>
        </div>
        <ParentAccessButton />
      </header>

      <p style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 900, margin: '16px 4px 4px' }}>
        Coucou Leanna ! Quel chat-musicien choisit-on aujourd’hui ?
      </p>

      <nav aria-label="Accès rapides" className="quick-tiles" style={{ marginTop: 12 }}>
        {TILES.map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className="glass"
            style={{ minHeight: 120, display: 'grid', placeItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', background: color }}
          >
            <Icon size={40} aria-hidden="true" />
            <span style={{ fontWeight: 900 }}>{label}</span>
          </Link>
        ))}
      </nav>

      {!library.ready ? (
        <LoadingState />
      ) : (
        <>
          {library.categories.length > 0 && (
            <>
              <h2 className="section-title">Les catégories</h2>
              <div className="grid-tiles">
                {library.categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    count={library.songs.filter((s) => s.categoryId === category.id).length}
                  />
                ))}
              </div>
            </>
          )}
          <h2 className="section-title">Mes chansons</h2>
          {library.songs.length === 0 ? (
            <EmptyState
              illustration="sun"
              title="Pas encore de chansons"
              description="Un parent peut ajouter les chansons préférées depuis l’espace parents."
            />
          ) : (
            <SongGrid songs={library.songs} source="all" soundsEnabled={settings.soundsEnabled} />
          )}
        </>
      )}
    </AppShell>
  );
}
