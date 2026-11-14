import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { useCelebration } from '../components/games/Celebration';
import { EmojiPicture } from '../components/ui/EmojiPicture';
import { NUMBER_WORDS, countingRound, groupChoices, quantity } from '../data/games';
import { speakFrench } from '../services/speech';

const MAX = 3; // On apprend jusqu'à 3 pour l'instant : changer ici pour aller plus loin.

type Mode = 'compter' | 'trouver';

function newRound(mode: Mode) {
  return { mode, ...countingRound(MAX), groups: groupChoices(MAX) };
}

/** Points sous le chiffre : on voit autant de points que la quantité. */
function Dots({ count }: { count: number }) {
  return <span className="compter-dots" aria-hidden="true">{'●'.repeat(count)}</span>;
}

/**
 * Apprendre à compter jusqu'à 3, en alternant :
 * - « compter » : toucher chaque objet, la voix compte « un, deux, trois » ;
 * - « trouver » : toucher le groupe qui a le bon nombre d'objets.
 */
export function CompterPage() {
  const [round, setRound] = useState(() => newRound('compter'));
  const [counted, setCounted] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState<{ group: number; tap: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const { celebrate, celebration } = useCelebration(3);
  const done = round.mode === 'compter' ? counted.length === round.count : found;

  const question = round.mode === 'compter' ? `Compte avec moi !` : `Où il y a ${quantity(round.item, round.count)} ?`;
  const ask = () => speakFrench(question);

  useEffect(() => {
    speakFrench(round.mode === 'compter' ? 'Compte avec moi !' : `Où il y a ${quantity(round.item, round.count)} ?`);
  }, [round]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const next = () => {
    timer.current = window.setTimeout(() => {
      setCounted([]);
      setFound(false);
      setWrong(null);
      setRound((r) => newRound(r.mode === 'compter' ? 'trouver' : 'compter'));
    }, 3000);
  };

  const count = (index: number) => {
    if (done || counted.includes(index)) return;
    const list = [...counted, index];
    setCounted(list);
    if (list.length < round.count) {
      speakFrench(`${NUMBER_WORDS[list.length]} !`);
      return;
    }
    speakFrench(`${NUMBER_WORDS[list.length]} ! Il y a ${quantity(round.item, round.count)}. Bravo !`);
    celebrate();
    next();
  };

  const choose = (group: number) => {
    if (done) return;
    if (group === round.count) {
      setFound(true);
      speakFrench(`Oui ! ${quantity(round.item, group)}. Bravo !`);
      celebrate();
      next();
    } else {
      setWrong((prev) => ({ group, tap: (prev?.tap ?? 0) + 1 }));
      // On compte le groupe touché avec elle : l'erreur devient une occasion d'apprendre.
      speakFrench(`Là, il y a ${quantity(round.item, group)}. Cherche ${quantity(round.item, round.count)} !`);
    }
  };

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Compter jusqu'à 3" />

      <button type="button" className="cherche-question" onClick={ask}>
        <Volume2 size={26} aria-hidden="true" className="imagier-card__sound" />
        {question}
      </button>

      {round.mode === 'compter' ? (
        <>
          <p className={`compter-total${done ? ' is-done' : ''}`} aria-live="polite">
            {counted.length || '?'}
            {counted.length > 0 && <Dots count={counted.length} />}
          </p>
          <div className="compter-row" key={`${round.item.id}-${round.count}`}>
            {Array.from({ length: round.count }, (_, i) => {
              const order = counted.indexOf(i);
              return (
                <button
                  key={i}
                  type="button"
                  className={`compter-item imagier-card__emoji${order >= 0 ? ' is-counted' : ''}`}
                  style={{ animationDelay: `${i * 120}ms` }}
                  onClick={() => count(i)}
                  aria-label={order >= 0 ? `${round.item.name} numéro ${order + 1}` : round.item.name}
                >
                  <EmojiPicture emoji={round.item.emoji} />
                  {order >= 0 && <span className="compter-badge">{order + 1}</span>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="compter-groups" key={`${round.item.id}-${round.count}-groups`}>
          {round.groups.map((group) => {
            const isWrong = wrong?.group === group;
            const state = found ? (group === round.count ? ' is-found' : ' is-faded') : isWrong ? ' is-wrong' : ' is-entering';
            return (
              <button
                key={isWrong ? `${group}-${wrong.tap}` : group}
                type="button"
                className={`imagier-card cherche-card compter-group imagier-tint--${round.item.category}${state}`}
                onClick={() => choose(group)}
                aria-label={quantity(round.item, group)}
              >
                <span className="compter-group__items">
                  {Array.from({ length: group }, (_, i) => (
                    <span key={i} className="imagier-card__emoji"><EmojiPicture emoji={round.item.emoji} /></span>
                  ))}
                </span>
                {((found && group === round.count) || isWrong) && <span className="compter-badge compter-badge--group">{group}</span>}
              </button>
            );
          })}
        </div>
      )}
      {celebration}
    </AppShell>
  );
}
