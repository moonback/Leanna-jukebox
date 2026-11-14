import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { useCelebration } from '../components/games/Celebration';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { IMAGIER_ITEMS, memoryDeck, spokenWord } from '../data/imagier';
import { speakFrench } from '../services/speech';

const PAIRS = 6;

/** Jeu de mémoire : retourner deux cartes pour retrouver les paires d'images. */
export function MemoirePage() {
  const [deck, setDeck] = useState(() => memoryDeck(IMAGIER_ITEMS, PAIRS));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  const won = matched.size === PAIRS;
  const { celebrate, celebration } = useCelebration(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flip = (index: number) => {
    const card = deck[index]!;
    if (open.length === 2 || open.includes(index) || matched.has(card.item.id)) return;
    const next = [...open, index];
    setOpen(next);
    if (next.length < 2) {
      speakFrench(spokenWord(card.item));
      return;
    }
    const first = deck[next[0]!]!;
    if (first.item.id === card.item.id) {
      const done = new Set(matched).add(card.item.id);
      setMatched(done);
      setOpen([]);
      celebrate(done.size === PAIRS); // confettis à chaque paire, autocollant à la victoire
      speakFrench(done.size === PAIRS ? 'Bravo ! Tu as trouvé toutes les paires !' : `Bravo ! Deux fois ${spokenWord(card.item)} !`);
    } else {
      speakFrench(spokenWord(card.item));
      timer.current = window.setTimeout(() => setOpen([]), 1300);
    }
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setOpen([]);
    setMatched(new Set());
    setDeck(memoryDeck(IMAGIER_ITEMS, PAIRS));
  };

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Mémoire">
        <button type="button" className="btn btn--secondary btn--icon" onClick={restart} aria-label="Nouvelle partie">
          <RotateCcw size={24} />
        </button>
      </GameHeader>

      <div className="memo-grid">
        {deck.map(({ key, item }, i) => {
          const isMatched = matched.has(item.id);
          const isOpen = isMatched || open.includes(i);
          return (
            <button
              key={key}
              type="button"
              className={`memo-card${isOpen ? ' is-open' : ''}${isMatched ? ' is-matched' : ''}`}
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => flip(i)}
              aria-label={isOpen ? spokenWord(item) : 'Carte cachée'}
            >
              <span className="memo-card__inner">
                <span className="memo-card__face memo-card__back" aria-hidden="true">🐾</span>
                <span className={`memo-card__face memo-card__front imagier-tint--${item.category}`} aria-hidden="true">
                  <span className="imagier-card__emoji"><EmojiPicture emoji={item.emoji} /></span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {won && (
        <div className="memo-win" aria-live="polite">
          <p>🎉 Bravo, tu as tout trouvé !</p>
          <button type="button" className="cherche-question" onClick={restart}>
            <RotateCcw size={24} aria-hidden="true" /> Rejouer
          </button>
        </div>
      )}
      {celebration}
    </AppShell>
  );
}
