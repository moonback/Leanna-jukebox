import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { useCelebration } from '../components/games/Celebration';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { IMAGIER_ITEMS, pickRound, spokenWord, type ImagierItem } from '../data/imagier';
import { speakFrench } from '../services/speech';
import { playWrong } from '../services/sound';
import { recordGameRound } from '../services/gameProgress';

const CHOICES = 4;

/** Cherche et trouve : la voix demande « Où est le chat ? », l'enfant touche la bonne vignette. */
export function ChercheTrouvePage() {
  const [round, setRound] = useState(() => pickRound(IMAGIER_ITEMS, CHOICES));
  const [wrong, setWrong] = useState<{ id: string; tap: number } | null>(null);
  const [found, setFound] = useState(false);
  const [stars, setStars] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const { celebrate, celebration } = useCelebration(5);

  const ask = (target: ImagierItem) => speakFrench(`Où est ${spokenWord(target)} ?`);

  useEffect(() => {
    ask(round.target);
  }, [round]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = (item: ImagierItem) => {
    if (found) return;
    if (item.id === round.target.id) {
      setFound(true);
      void recordGameRound('cherche-trouve');
      setStars((s) => s + 1);
      speakFrench(`Bravo ! C'est ${spokenWord(item)} !`);
      celebrate();
      timer.current = window.setTimeout(() => {
        setFound(false);
        setWrong(null);
        setRound(pickRound(IMAGIER_ITEMS, CHOICES));
      }, 2200);
    } else {
      // `tap` relance l'animation de secousse à chaque erreur.
      setWrong((prev) => ({ id: item.id, tap: (prev?.tap ?? 0) + 1 }));
      playWrong();
      speakFrench(`Ça, c'est ${spokenWord(item)}. Où est ${spokenWord(round.target)} ?`);
    }
  };

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Cherche et trouve">
        <span className="cherche-stars" aria-label={`${stars} étoiles`}>⭐ {stars}</span>
      </GameHeader>

      <button type="button" className="cherche-question" onClick={() => ask(round.target)}>
        <Volume2 size={26} aria-hidden="true" className="imagier-card__sound" />
        Où est {spokenWord(round.target)} ?
      </button>

      <div className="cherche-grid" key={round.target.id}>
        {round.choices.map((item, i) => {
          const isTarget = item.id === round.target.id;
          const isWrong = wrong?.id === item.id;
          const state = found ? (isTarget ? ' is-found' : ' is-faded') : isWrong ? ' is-wrong' : ' is-entering';
          return (
            <button
              key={isWrong ? `${item.id}-${wrong.tap}` : item.id}
              type="button"
              className={`imagier-card cherche-card imagier-tint--${item.category}${state}`}
              style={{ animationDelay: state === ' is-entering' ? `${i * 80}ms` : undefined }}
              onClick={() => choose(item)}
              aria-label={spokenWord(item)}
            >
              <span className="imagier-card__emoji"><EmojiPicture emoji={item.emoji} /></span>
            </button>
          );
        })}
      </div>

      {found && <p className="cherche-bravo" aria-live="polite">🎉 Bravo !</p>}
      {celebration}
    </AppShell>
  );
}
