import { Link } from 'react-router-dom';
import { Smile, Images } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ParentAccessButton } from '../components/parental/ParentAccessButton';
import { Illustration } from '../illustrations/Illustration';

const TILES = [
  { to: '/simple', label: 'Musique', hint: 'Écouter une chanson', icon: Smile, color: '#e0ecdf' },
  { to: '/imagier', label: 'Imagier', hint: 'Découvrir les images', icon: Images, color: '#f1dce8' },
] as const;

/** Accueil enfant : mascotte, message de bienvenue et deux grands choix centrés. */
export function HomePage() {
  return (
    <AppShell showNavigation={false}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ParentAccessButton />
      </div>

      <main style={{ display: 'grid', justifyItems: 'center', gap: 16, textAlign: 'center', marginTop: 8 }}>
        <Illustration name="cat" className="anim-float brand-mascot" style={{ width: 120, height: 120 }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 7vw, 3rem)', fontWeight: 900, lineHeight: 1.05 }}>Leanna Jukebox</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Le petit monde musical de Leanna</p>
        </div>
        <p style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 900, margin: 0 }}>
          Coucou Leanna ! Que choisis-tu ?
        </p>

        <nav
          aria-label="Choix"
          className="quick-tiles"
          style={{ width: '100%', marginTop: 8, gridTemplateColumns: 'repeat(2, minmax(0, 280px))', justifyContent: 'center' }}
        >
          {TILES.map(({ to, label, hint, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="glass"
              style={{ minHeight: 150, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 6, textDecoration: 'none', color: 'inherit', background: color }}
            >
              <Icon size={48} aria-hidden="true" />
              <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>{label}</span>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{hint}</span>
            </Link>
          ))}
        </nav>
      </main>
    </AppShell>
  );
}
