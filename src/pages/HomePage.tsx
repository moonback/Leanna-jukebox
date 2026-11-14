import { Link } from 'react-router-dom';
import { Smile, Images, Search } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ParentAccessButton } from '../components/parental/ParentAccessButton';
import { Illustration } from '../illustrations/Illustration';
import { speakFrench } from '../services/speech';

const TILES = [
  { to: '/simple', label: 'Musique', hint: 'Écouter une chanson', icon: Smile, color: '#e0ecdf' },
  { to: '/imagier', label: 'Imagier', hint: 'Découvrir les images', icon: Images, color: '#f1dce8' },
  { to: '/cherche', label: 'Cherche et trouve', hint: 'Trouver la bonne image', icon: Search, color: '#dceaf3' },
] as const;

const MUSIC_BG = [
  { e: '🎵', top: '6%', left: '8%', d: 0 },
  { e: '🎸', top: '14%', left: '78%', d: 1 },
  { e: '🥁', top: '30%', left: '88%', d: 2 },
  { e: '🎹', top: '38%', left: '4%', d: 3 },
  { e: '🎤', top: '58%', left: '82%', d: 0.5 },
  { e: '🎶', top: '66%', left: '10%', d: 1.5 },
  { e: '🎺', top: '80%', left: '70%', d: 2.5 },
  { e: '🎻', top: '86%', left: '24%', d: 3.5 },
  { e: '🎷', top: '48%', left: '46%', d: 4 },
  { e: '🎼', top: '4%', left: '44%', d: 2 },
] as const;

/** Accueil enfant : mascotte, message de bienvenue et deux grands choix centrés, sur un fond d'images musicales. */
export function HomePage() {
  return (
    <AppShell showNavigation={false}>
      <div className="home-music-bg" aria-hidden="true">
        {MUSIC_BG.map(({ e, top, left, d }) => (
          <span key={e} style={{ top, left, animationDelay: `${d}s` }}>{e}</span>
        ))}
      </div>
      <div className="home-content" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ParentAccessButton />
      </div>

      <main className="home-content" style={{ display: 'grid', justifyItems: 'center', gap: 16, textAlign: 'center', marginTop: 8 }}>
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
          style={{ width: '100%', marginTop: 8, gridTemplateColumns: `repeat(${TILES.length}, minmax(0, 240px))`, justifyContent: 'center' }}
        >
          {TILES.map(({ to, label, hint, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              onClick={() => speakFrench(label)}
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
