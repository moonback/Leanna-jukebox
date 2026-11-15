import { useRef, useState, type CSSProperties } from 'react';
import { Illustration } from '../../illustrations/Illustration';
import { EmojiPicture } from '../ui/EmojiPicture';
import { awardSticker } from '../../services/stickers';
import { IMAGIER_ITEMS } from '../../data/imagier';
import { playApplause, playFirework } from '../../services/sound';

const COLORS = ['#ff4d4d', '#ffd23f', '#4dff88', '#4fb3ff', '#c27bff', '#ff7ad9', '#ffa53c', '#7dfcff'];
const GOLD = '#ffd27a';
const RISE = 0.6; // durée de montée de la fusée, en secondes

type Kind = 'pivoine' | 'anneau' | 'saule' | 'bicolore';

interface Rocket {
  left: number;
  top: number;
  kind: Kind;
  color: string;
  delay: number;
  size: number;
  // Tirés une seule fois au lancement : un nouveau rendu du jeu ne doit pas faire sauter les étincelles.
  sparks: { angle: number; dist: number; color: string }[];
  glitter: { x: number; y: number; delay: number }[];
}

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;

/** Le spectacle : 7 fusées variées l'une après l'autre, puis un bouquet final de 4 fusées ensemble. */
function launchShow(): Rocket[] {
  const kinds: Kind[] = ['pivoine', 'anneau', 'saule', 'bicolore'];
  const rocket = (delay: number, kind: Kind = pick(kinds)): Rocket => {
    const color = kind === 'saule' ? GOLD : pick(COLORS);
    const size = kind === 'saule' ? 150 + Math.random() * 60 : 110 + Math.random() * 90;
    return {
      left: 10 + Math.random() * 80,
      top: 10 + Math.random() * 32,
      kind,
      color,
      delay,
      size,
      sparks: sparksOf(kind, color, pick(COLORS)),
      glitter: Array.from({ length: 10 }, () => ({ x: (Math.random() - 0.5) * size * 1.6, y: (Math.random() - 0.3) * size * 1.4, delay: Math.random() * 0.5 })),
    };
  };
  const show = Array.from({ length: 7 }, (_, i) => rocket(i * 0.32 + Math.random() * 0.1));
  const finale = 2.5;
  show.push(rocket(finale, 'pivoine'), rocket(finale + 0.05, 'anneau'), rocket(finale + 0.1, 'bicolore'), rocket(finale + 0.12, 'saule'));
  return show;
}

/**
 * Réussite : feu d'artifice avec « boum », applaudissements et chat qui saute de joie.
 * Un autocollant est gagné à chaque grande victoire (`celebrate(true)`) et toutes les `stickerEvery` réussites (0 = jamais).
 */
export function useCelebration(stickerEvery: number) {
  const wins = useRef(0);
  const [show, setShow] = useState<{ burst: number; sticker: string | null; rockets: Rocket[] }>({ burst: 0, sticker: null, rockets: [] });

  const celebrate = (bigWin = false) => {
    wins.current += 1;
    const award = bigWin || (stickerEvery > 0 && wins.current % stickerEvery === 0);
    const sticker = award ? IMAGIER_ITEMS[Math.floor(Math.random() * IMAGIER_ITEMS.length)]!.emoji : null;
    if (sticker) void awardSticker(sticker);
    const rockets = launchShow();
    // Le son est calé sur l'animation : chaque « boum » tombe au moment où la fusée éclate.
    rockets.forEach((r) => playFirework(r.delay + RISE));
    playApplause(3.2, 0.5);
    setShow((s) => ({ burst: s.burst + 1, sticker, rockets }));
  };

  return { celebrate, celebration: <Celebration key={show.burst} {...show} /> };
}

/** Nombre d'étincelles et distance de chacune selon la forme de la gerbe. */
function sparksOf(kind: Kind, color: string, color2: string): Rocket['sparks'] {
  const count = kind === 'anneau' ? 36 : 30;
  return Array.from({ length: count }, (_, i) => ({
    angle: (360 / count) * i + (kind === 'anneau' ? 0 : Math.random() * 8),
    // L'anneau est parfaitement rond ; les autres gerbes sont irrégulières, comme en vrai.
    dist: kind === 'anneau' ? 1 : 0.65 + Math.random() * 0.4,
    color: kind === 'bicolore' && i % 2 ? color2 : color,
  }));
}

function Celebration({ burst, sticker, rockets }: { burst: number; sticker: string | null; rockets: Rocket[] }) {
  if (!burst) return null;
  return (
    <div className="celebration" aria-hidden="true">
      {rockets.map((r, i) => (
        <span
          key={i}
          className={`firework firework--${r.kind}`}
          style={{ left: `${r.left}%`, top: `${r.top}%`, '--color': r.color, '--delay': `${r.delay}s`, '--size': `${r.size}px` } as CSSProperties}
        >
          <span className="firework__rocket" />
          {r.sparks.map((s, k) => (
            <span key={k} className="firework__spark" style={{ '--angle': `${s.angle}deg`, '--dist': s.dist, '--spark': s.color } as CSSProperties} />
          ))}
          {/* Scintillements qui pétillent après l'explosion. */}
          {r.glitter.map((g, k) => (
            <span key={`g${k}`} className="firework__glitter" style={{ '--gx': `${g.x}px`, '--gy': `${g.y}px`, '--gd': `${g.delay}s` } as CSSProperties} />
          ))}
        </span>
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
