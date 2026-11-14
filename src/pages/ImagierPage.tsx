import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Volume2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { IMAGIER_CATEGORIES, IMAGIER_ITEMS, groupByLetter, spokenWord, type ImagierCategory, type ImagierItem } from '../data/imagier';
import { speakFrench, speechAvailable } from '../services/speech';

/** Imagier : animaux, fruits, légumes… rangés de A à Z. Toucher une image la fait dire à voix haute. */
export function ImagierPage() {
  const [category, setCategory] = useState<ImagierCategory | 'tout'>('tout');
  const [selected, setSelected] = useState<ImagierItem | null>(null);
  const groups = useMemo(() => groupByLetter(IMAGIER_ITEMS, category), [category]);
  const canSpeak = speechAvailable();

  const say = (item: ImagierItem) => {
    setSelected(item);
    speakFrench(spokenWord(item));
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  return (
    <AppShell>
      <header className="row-wrap" style={{ gap: 12 }}>
        <Link to="/" aria-label="Retour à l’accueil" className="btn btn--secondary btn--icon" style={{ textDecoration: 'none' }}>
          <ChevronLeft size={28} />
        </Link>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 900 }}>Imagier de A à Z</h1>
      </header>
      {!canSpeak && (
        <p className="muted" style={{ margin: '8px 4px 0' }}>La voix n’est pas disponible sur cet appareil : le mot s’affiche en grand.</p>
      )}

      <div className="chip-scroll" role="tablist" aria-label="Catégories" style={{ marginTop: 16 }}>
        {IMAGIER_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            className={category === c.id ? 'chip imagier-chip is-active' : 'chip imagier-chip'}
            onClick={() => setCategory(c.id)}
          >
            <span aria-hidden="true">{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <nav aria-label="Lettres" className="imagier-letters">
        {groups.map((g) => (
          <a key={g.letter} href={`#lettre-${g.letter}`} onClick={(e) => {
            e.preventDefault();
            document.getElementById(`lettre-${g.letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>
            {g.letter}
          </a>
        ))}
      </nav>

      {groups.map((g) => (
        <section key={g.letter} id={`lettre-${g.letter}`} aria-label={`Lettre ${g.letter}`}>
          <h2 className="imagier-letter">{g.letter}</h2>
          <div className="imagier-grid">
            {g.items.map((item) => (
              <button key={item.id} type="button" className="glass imagier-card" onClick={() => say(item)} aria-label={spokenWord(item)}>
                <span className="imagier-card__emoji" aria-hidden="true">{item.emoji}</span>
                <span className="imagier-card__name">{item.name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-label={spokenWord(selected)} className="imagier-zoom anim-pop" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="imagier-zoom__emoji" onClick={() => speakFrench(spokenWord(selected))} aria-label="Répéter">
              {selected.emoji}
            </button>
            <p className="imagier-zoom__word">{spokenWord(selected)}</p>
            <div className="row-wrap" style={{ justifyContent: 'center', gap: 12 }}>
              {canSpeak && (
                <button type="button" className="btn btn--secondary" onClick={() => speakFrench(spokenWord(selected))}>
                  <Volume2 size={24} aria-hidden="true" /> Encore
                </button>
              )}
              <button type="button" className="btn btn--primary" onClick={() => setSelected(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
