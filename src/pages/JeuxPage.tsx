import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { speakFrench } from '../services/speech';

const GAMES = [
  { to: '/ballons', label: 'Ballons', emoji: '🎈', tint: 'fruits' },
  { to: '/piano', label: 'Piano', emoji: '🎹', tint: 'vehicules' },
  { to: '/cherche', label: 'Cherche et trouve', emoji: '🔍', tint: 'maison' },
  { to: '/memoire', label: 'Mémoire', emoji: '🃏', tint: 'nature' },
  { to: '/ombres', label: 'Ombres', emoji: '🐘', tint: 'animaux' },
] as const;

/** Tous les jeux, du plus simple au plus difficile. */
export function JeuxPage() {
  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Jeux" back="/" />
      <nav aria-label="Jeux" className="imagier-grid" style={{ marginTop: 16 }}>
        {GAMES.map((game, i) => (
          <Link
            key={game.to}
            to={game.to}
            onClick={() => speakFrench(game.label)}
            className={`imagier-card is-entering imagier-tint--${game.tint}`}
            style={{ textDecoration: 'none', animationDelay: `${i * 40}ms` }}
            aria-label={game.label}
          >
            <span className="imagier-card__bubble" aria-hidden="true">
              <span className="imagier-card__emoji"><EmojiPicture emoji={game.emoji} /></span>
            </span>
            <span className="imagier-card__name">{game.label}</span>
          </Link>
        ))}
      </nav>
    </AppShell>
  );
}
