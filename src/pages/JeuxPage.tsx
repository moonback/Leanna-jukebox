import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { speakFrench } from '../services/speech';

// Âge minimum conseillé, et ordre d'affichage : du plus simple au plus difficile.
const GAMES = [
  { to: '/mini-jeux', label: 'Mes petits jeux', emoji: '🧩', tint: 'nature', minAge: 3 },
  { to: '/ballons', label: 'Ballons', emoji: '🎈', tint: 'fruits', minAge: 2 },
  { to: '/piano', label: 'Piano', emoji: '🎹', tint: 'vehicules', minAge: 2 },
  { to: '/cherche', label: 'Cherche et trouve', emoji: '🔍', tint: 'maison', minAge: 2 },
  { to: '/compter', label: 'Compter jusqu’à 3', emoji: '🍎', tint: 'legumes', minAge: 3 },
  { to: '/ombres', label: 'Ombres', emoji: '🐘', tint: 'animaux', minAge: 3 },
  { to: '/memoire', label: 'Mémoire', emoji: '🃏', tint: 'nature', minAge: 4 },
  { to: '/mini/couleurs', label: 'Les couleurs', emoji: '🎨', tint: 'fruits', minAge: 2 },
  { to: '/mini/formes', label: 'Les formes', emoji: '🔺', tint: 'nature', minAge: 2 },
  { to: '/mini/puzzle', label: 'Puzzle 4 pièces', emoji: '🧩', tint: 'maison', minAge: 3 },
  { to: '/mini/tailles', label: 'Grand ou petit ?', emoji: '🐘', tint: 'animaux', minAge: 2 },
  { to: '/mini/cris', label: 'Cris des animaux', emoji: '🐮', tint: 'animaux', minAge: 2 },
] as const;

/** Tous les jeux, avec l'âge conseillé. */
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
            aria-label={`${game.label}, dès ${game.minAge} ans`}
          >
            <span className="jeux-age" aria-hidden="true">Dès {game.minAge} ans</span>
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
