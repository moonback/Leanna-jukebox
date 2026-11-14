import { useState, type CSSProperties } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { PIANO_KEYS } from '../data/games';
import { playTone } from '../services/sound';

/** Piano des animaux : chaque grosse touche joue une note et fait danser son animal. */
export function PianoPage() {
  // `tap` relance l'animation de la touche à chaque appui.
  const [pressed, setPressed] = useState<{ index: number; tap: number } | null>(null);

  const play = (index: number) => {
    playTone(PIANO_KEYS[index]!.freq, 0.8, 'triangle', 0.25);
    setPressed((prev) => ({ index, tap: (prev?.tap ?? 0) + 1 }));
  };

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Piano des animaux" />
      <div className="piano">
        {PIANO_KEYS.map((key, i) => {
          const on = pressed?.index === i;
          return (
            <button
              key={on ? `${i}-${pressed.tap}` : i}
              type="button"
              className={`piano-key${on ? ' is-pressed' : ''}`}
              style={{ '--key': key.color } as CSSProperties}
              onPointerDown={() => play(i)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && play(i)}
              aria-label={`Note ${key.note}`}
            >
              <span className="piano-key__animal imagier-card__emoji" aria-hidden="true"><EmojiPicture emoji={key.emoji} /></span>
              <span className="piano-key__note">{key.note}</span>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
