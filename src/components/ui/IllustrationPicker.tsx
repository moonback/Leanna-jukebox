import { Illustration } from '../../illustrations/Illustration';
import { ILLUSTRATION_KEYS, type IllustrationKey } from '../../illustrations/illustrationKeys';

interface IllustrationPickerProps {
  value: IllustrationKey;
  onChange: (value: IllustrationKey) => void;
  label?: string;
}

const NAMES: Record<IllustrationKey, string> = {
  bear: 'Ourson',
  bunny: 'Lapin',
  fox: 'Renard',
  cat: 'Chat',
  panda: 'Panda',
  star: 'Étoile',
  cloud: 'Nuage',
  rainbow: 'Arc-en-ciel',
  note: 'Note de musique',
  sun: 'Soleil',
};

/** Choix d'illustration par boutons (aucun fichier à téléverser). */
export function IllustrationPicker({ value, onChange, label = 'Illustration' }: IllustrationPickerProps) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
      <legend style={{ fontWeight: 800, marginBottom: 6 }}>{label}</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
        {ILLUSTRATION_KEYS.map((key) => {
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              aria-label={NAMES[key]}
              title={NAMES[key]}
              onClick={() => onChange(key)}
              style={{
                padding: 6,
                borderRadius: 16,
                background: selected ? 'linear-gradient(135deg, #ffc2d6, #d9ccf6)' : '#fff',
                border: selected ? '3px solid var(--color-lavender-deep)' : '2px solid #ece4f7',
                minHeight: 72,
              }}
            >
              <Illustration name={key} style={{ width: '100%', height: 56 }} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
