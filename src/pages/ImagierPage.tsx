import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Volume2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { IMAGIER_CATEGORIES, IMAGIER_ITEMS, groupByLetter, spokenWord, type ImagierCategory, type ImagierItem } from '../data/imagier';
import { speakFrench } from '../services/speech';

/** Imagier : animaux, fruits, légumes… rangés de A à Z. Toucher une image dit son nom à voix haute. */
export function ImagierPage() {
  const [category, setCategory] = useState<ImagierCategory | 'tout'>('tout');
  // `tap` change à chaque toucher pour relancer l'animation, même sur la même carte.
  const [active, setActive] = useState<{ id: string; tap: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const groups = useMemo(() => groupByLetter(IMAGIER_ITEMS, category), [category]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const say = (item: ImagierItem) => {
    speakFrench(spokenWord(item));
    setActive((prev) => ({ id: item.id, tap: (prev?.tap ?? 0) + 1 }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(null), 2500);
  };

  const jumpTo = (letter: string) =>
    document.getElementById(`lettre-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <AppShell>
      <header className="row-wrap" style={{ gap: 12 }}>
        <Link to="/" aria-label="Retour à l’accueil" className="btn btn--secondary btn--icon" style={{ textDecoration: 'none' }}>
          <ChevronLeft size={28} />
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 900, lineHeight: 1.05 }}>Mon imagier</h1>
          <p className="muted" style={{ margin: 0 }}>Touche une image pour entendre son nom</p>
        </div>
      </header>

      <div className="imagier-toolbar glass">
        <div className="chip-scroll" role="tablist" aria-label="Catégories">
          {IMAGIER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className={`imagier-tab imagier-tint--${c.id}${category === c.id ? ' is-active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <span className="imagier-tab__emoji" aria-hidden="true">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
        <nav aria-label="Lettres" className="imagier-letters">
          {groups.map((g) => (
            <button key={g.letter} type="button" onClick={() => jumpTo(g.letter)} aria-label={`Aller à la lettre ${g.letter}`}>
              {g.letter}
            </button>
          ))}
        </nav>
      </div>

      {groups.map((g) => (
        <section key={g.letter} id={`lettre-${g.letter}`} aria-label={`Lettre ${g.letter}`} className="imagier-section">
          <h2 className="imagier-letter">
            <span className="imagier-letter__badge">{g.letter}</span>
            <span className="imagier-letter__lower" aria-hidden="true">{g.letter.toLowerCase()}</span>
          </h2>
          <div className="imagier-grid">
            {g.items.map((item) => {
              const isActive = active?.id === item.id;
              return (
                <button
                  key={isActive ? `${item.id}-${active.tap}` : item.id}
                  type="button"
                  className={`imagier-card imagier-tint--${item.category}${isActive ? ' is-speaking' : ''}`}
                  onClick={() => say(item)}
                  aria-label={spokenWord(item)}
                >
                  <span className="imagier-card__bubble" aria-hidden="true">
                    <span className="imagier-card__emoji">{item.emoji}</span>
                  </span>
                  <span className="imagier-card__name">
                    {isActive && <Volume2 size={18} aria-hidden="true" className="imagier-card__sound" />}
                    {isActive ? spokenWord(item) : item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </AppShell>
  );
}
