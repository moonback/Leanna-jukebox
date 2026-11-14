import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { Illustration } from '../../illustrations/Illustration';
import { EmojiPicture } from '../ui/EmojiPicture';
import { awardSticker } from '../../services/stickers';

const CONFETTI_COLORS = ['#ef5b5b', '#f5c842', '#5cbf6a', '#4f8fe6', '#9b6fd8', '#f48fb1', '#f59a3c'];

/**
 * Réussite : confettis + chat qui saute de joie. Un autocollant est gagné à chaque grande victoire
 * (`celebrate(true)`) et toutes les `stickerEvery` réussites (0 = jamais).
 */
export function useCelebration(stickerEvery: number) {
  const wins = useRef(0);
  const [show, setShow] = useState<{ burst: number; sticker: string | null }>({ burst: 0, sticker: null });

  const celebrate = (bigWin = false) => {
    wins.current += 1;
    const award = bigWin || (stickerEvery > 0 && wins.current % stickerEvery === 0);
    const sticker = award ? awardSticker() : null;
    setShow((s) => ({ burst: s.burst + 1, sticker }));
  };

  return { celebrate, celebration: <Celebration key={show.burst} burst={show.burst} sticker={show.sticker} /> };
}

function Celebration({ burst, sticker }: { burst: number; sticker: string | null }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        animationDelay: `${Math.random() * 0.25}s`,
        '--drift': `${(Math.random() - 0.5) * 220}px`,
        '--spin': `${360 + Math.random() * 540}deg`,
      })),
    [],
  );
  if (!burst) return null;
  return (
    <div className="celebration" aria-hidden="true">
      {pieces.map((style, i) => (
        <span key={i} className="celebration__confetti" style={style as CSSProperties} />
      ))}
      <Illustration name="cat" className="celebration__cat" />
      {sticker && (
        <div className="celebration__sticker">
          <span className="imagier-card__emoji"><EmojiPicture emoji={sticker} /></span>
          <strong>Nouvel autocollant !</strong>
        </div>
      )}
    </div>
  );
}
