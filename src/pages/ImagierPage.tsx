import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Volume2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { IMAGIER_CATEGORIES, IMAGIER_ITEMS, groupByLetter, initialOf, letterPhrase, spokenWord, type ImagierCategory, type ImagierItem } from '../data/imagier';
import { speakFrench } from '../services/speech';
import { EmojiPicture } from '../components/ui/EmojiPicture';


/** Imagier : animaux, fruits, légumes… rangés de A à Z. Toucher une image dit son nom à voix haute. */
export function ImagierPage() {
  const [category, setCategory] = useState<ImagierCategory | 'tout'>('tout');
  // `tap` change à chaque toucher pour relancer l'animation, même sur la même carte.
  const [active, setActive] = useState<{ id: string; tap: number } | null>(null);
  const [zoom, setZoom] = useState<ImagierItem | null>(null);
  const timers = useRef<number[]>([]);
  const groups = useMemo(() => groupByLetter(IMAGIER_ITEMS, category), [category]);
  const visible = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const say = (item: ImagierItem) => {
    clearTimers();
    speakFrench(letterPhrase(item));
    setActive((prev) => ({ id: item.id, tap: (prev?.tap ?? 0) + 1 }));
    setZoom(item);
    timers.current.push(window.setTimeout(() => setActive(null), 2500));
  };

  /** Bouton surprise : va jusqu'à une image au hasard puis la dit. */
  const surprise = () => {
    const item = visible[Math.floor(Math.random() * visible.length)];
    if (!item) return;
    clearTimers();
    document.getElementById(`carte-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    timers.current.push(window.setTimeout(() => say(item), 550));
  };

  return (
    <AppShell showNavigation={false}>
      <header className="imagier-hero glass">
        <Link to="/" aria-label="Retour à l’accueil" className="btn btn--secondary btn--icon imagier-hero__back" style={{ textDecoration: 'none' }}>
          <ChevronLeft size={28} />
        </Link>
        <div className="imagier-hero__text">
          <h1>Mon imagier</h1>
        </div>
        <button type="button" className="imagier-surprise" onClick={surprise} aria-label="Surprise : une image au hasard">
          <span aria-hidden="true" className="imagier-surprise__dice">🎲</span>
        </button>
        <div className="chip-scroll" role="tablist" aria-label="Catégories">
          {IMAGIER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              aria-label={c.label}
              title={c.label}
              className={`imagier-tab imagier-tint--${c.id}${category === c.id ? ' is-active' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <span className="imagier-tab__emoji" aria-hidden="true"><EmojiPicture emoji={c.emoji} /></span>
            </button>
          ))}
        </div>
      </header>

      {/* La clé change avec la catégorie : les cartes réapparaissent avec leur petite animation. */}
      <div key={category}>
        <div className="imagier-grid">
              {visible.map((item, i) => {
                const isActive = active?.id === item.id;
                return (
                  <button
                    key={isActive ? `${item.id}-${active.tap}` : item.id}
                    id={`carte-${item.id}`}
                    type="button"
                    className={`imagier-card imagier-tint--${item.category}${isActive ? ' is-speaking' : ' is-entering'}`}
                    style={{ animationDelay: isActive ? undefined : `${Math.min(i * 30, 400)}ms` }}
                    onClick={() => say(item)}
                    aria-label={spokenWord(item)}
                  >
                    <span className="imagier-card__bubble" aria-hidden="true">
                      <span className="imagier-card__emoji"><EmojiPicture emoji={item.emoji} /></span>
                    </span>
                    <span className="imagier-card__name">
                      {isActive ? (
                        <>
                          <Volume2 size={18} aria-hidden="true" className="imagier-card__sound" />
                          {initialOf(item.name)} comme {item.name}
                        </>
                      ) : (
                        <span>
                          <span className="imagier-card__initial">{item.name.charAt(0)}</span>
                          {item.name.slice(1)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
        </div>
      </div>

      <p className="imagier-end">
        <span aria-hidden="true">🎉</span> Bravo, tu as vu les {visible.length} images&nbsp;!
      </p>

      {zoom && (
        // Toucher n'importe où ferme ; toucher l'image la fait redire.
        <div className="modal-backdrop imagier-zoom" onClick={() => setZoom(null)}>
          <div
            key={zoom.id}
            role="dialog"
            aria-modal="true"
            aria-label={spokenWord(zoom)}
            className={`imagier-zoom__card imagier-tint--${zoom.category}`}
          >
            <span className="imagier-zoom__sparkles" aria-hidden="true">✨</span>
            <button
              type="button"
              className="imagier-zoom__picture"
              aria-label={`Redire ${spokenWord(zoom)}`}
              onClick={(e) => {
                e.stopPropagation();
                speakFrench(letterPhrase(zoom));
              }}
            >
              <EmojiPicture emoji={zoom.emoji} />
            </button>
            <span className="imagier-zoom__shadow" aria-hidden="true" />
            <p className="imagier-zoom__name">
              <span className="imagier-card__initial">{initialOf(zoom.name)}</span> comme {zoom.name}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
