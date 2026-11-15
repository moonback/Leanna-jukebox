import { useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { useCelebration } from '../components/games/Celebration';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { IMAGIER_ITEMS, emojiImage, pickRound, spokenWord, type ImagierItem } from '../data/imagier';
import { speakFrench } from '../services/speech';
import { playWrong } from '../services/sound';
import { recordGameRound } from '../services/gameProgress';

// Une silhouette n'a de sens qu'avec une vraie image (l'emoji texte ne se noircit pas partout pareil).
const WITH_IMAGE = IMAGIER_ITEMS.filter((i) => emojiImage(i.emoji));

/** Ombres : retrouver la silhouette noire qui correspond à l'image. */
export function OmbresPage() {
  const [round, setRound] = useState(() => pickRound(WITH_IMAGE, 3));
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState<{ id: string; tap: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const { celebrate, celebration } = useCelebration(5);

  useEffect(() => {
    speakFrench(`Trouve l'ombre de ${spokenWord(round.target)} !`);
  }, [round]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = (item: ImagierItem) => {
    if (found) return;
    if (item.id === round.target.id) {
      setFound(true);
      void recordGameRound('ombres').catch(() => undefined);
      speakFrench(`Bravo ! C'est l'ombre de ${spokenWord(item)} !`);
      celebrate();
      timer.current = window.setTimeout(() => {
        setFound(false);
        setWrong(null);
        setRound(pickRound(WITH_IMAGE, 3));
      }, 2400);
    } else {
      setWrong((prev) => ({ id: item.id, tap: (prev?.tap ?? 0) + 1 }));
      playWrong();
      speakFrench('Non, cherche encore !');
    }
  };

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Ombres" />
      <div className="ombres-model imagier-card__emoji" key={round.target.id} aria-hidden="true">
        <EmojiPicture emoji={round.target.emoji} />
      </div>
      <div className="cherche-grid ombres-grid">
        {round.choices.map((item) => {
          const isWrong = wrong?.id === item.id;
          const state = found ? (item.id === round.target.id ? ' is-found' : ' is-faded') : isWrong ? ' is-wrong' : '';
          return (
            <button
              key={isWrong ? `${item.id}-${wrong.tap}` : item.id}
              type="button"
              className={`imagier-card cherche-card ombres-card${state}`}
              onClick={() => choose(item)}
              aria-label={`Ombre ${spokenWord(item)}`}
            >
              <span className="imagier-card__emoji ombres-shadow"><EmojiPicture emoji={item.emoji} /></span>
            </button>
          );
        })}
      </div>
      {celebration}
    </AppShell>
  );
}
