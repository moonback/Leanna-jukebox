import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { GameHeader } from '../components/games/GameHeader';
import { useCelebration } from '../components/games/Celebration';
import { BALLOON_COLORS } from '../data/games';
import { speakFrench } from '../services/speech';
import { playTone } from '../services/sound';

interface Balloon {
  id: number;
  color: (typeof BALLOON_COLORS)[number];
  left: number;
  duration: number;
  popped: boolean;
}

const MAX_BALLOONS = 6;

/** Ballons à éclater : ils montent, l'enfant les touche, la voix dit la couleur. Impossible de perdre. */
export function BallonsPage() {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const nextId = useRef(0);
  const { celebrate, celebration } = useCelebration(10);

  useEffect(() => {
    const spawn = () =>
      setBalloons((list) => {
        if (list.length >= MAX_BALLOONS) return list;
        nextId.current += 1;
        const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)]!;
        return [...list, { id: nextId.current, color, left: 4 + Math.random() * 72, duration: 6 + Math.random() * 3, popped: false }];
      });
    spawn();
    const interval = window.setInterval(spawn, 1100);
    return () => window.clearInterval(interval);
  }, []);

  const remove = (id: number) => setBalloons((list) => list.filter((b) => b.id !== id));

  const pop = (balloon: Balloon) => {
    if (balloon.popped) return;
    playTone(880, 0.15, 'triangle', 0.2);
    speakFrench(`${balloon.color.name} !`);
    setBalloons((list) => list.map((b) => (b.id === balloon.id ? { ...b, popped: true } : b)));
    window.setTimeout(() => remove(balloon.id), 350);
    celebrateEvery5();
  };

  // Feu d'artifice tous les 5 ballons, autocollant tous les 10.
  const popped = useRef(0);
  const celebrateEvery5 = () => {
    popped.current += 1;
    if (popped.current % 5 === 0) celebrate();
  };

  return (
    <AppShell showNavigation={false}>
      <GameHeader title="Ballons" />
      <div className="ballons-sky">
        {balloons.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`ballon${b.popped ? ' is-popped' : ''}`}
            style={{ left: `${b.left}%`, '--color': b.color.hex, animationDuration: `${b.duration}s` } as CSSProperties}
            onPointerDown={() => pop(b)}
            onAnimationEnd={(e) => e.animationName === 'ballon-rise' && remove(b.id)}
            aria-label={`Ballon ${b.color.name}`}
          />
        ))}
      </div>
      {celebration}
    </AppShell>
  );
}
