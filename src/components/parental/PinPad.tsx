import { useState } from 'react';
import { Delete } from 'lucide-react';
import { Button } from '../ui/Button';

interface PinPadProps {
  title: string;
  hint?: string;
  submitLabel: string;
  /** Renvoie un message d'erreur, ou null si la saisie est acceptée. */
  onSubmit: (pin: string) => Promise<string | null>;
  disabled?: boolean;
}

const MIN_LENGTH = 4;
const MAX_LENGTH = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Pavé numérique personnalisé (boutons, pas de champ texte) pour l'espace parents.
 * Le PIN n'est jamais affiché en clair : seuls des points indiquent la progression.
 */
export function PinPad({ title, hint, submitLabel, onSubmit, disabled = false }: PinPadProps) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const append = (digit: string) => {
    setError(null);
    setDigits((current) => (current.length < MAX_LENGTH ? current + digit : current));
  };

  const submit = async () => {
    if (digits.length < MIN_LENGTH || busy) return;
    setBusy(true);
    const message = await onSubmit(digits);
    setBusy(false);
    setError(message);
    setDigits('');
  };

  return (
    <div className="glass" style={{ padding: 24, display: 'grid', gap: 16, justifyItems: 'center', width: 'min(420px, 100%)' }}>
      <h2 style={{ margin: 0, textAlign: 'center' }}>{title}</h2>
      {hint && <p className="muted" style={{ margin: 0, textAlign: 'center' }}>{hint}</p>}
      <div aria-live="polite" aria-label={`${digits.length} chiffre(s) saisi(s)`} style={{ display: 'flex', gap: 12, minHeight: 20 }}>
        {Array.from({ length: MAX_LENGTH }, (_, i) => (
          <span
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: i < digits.length ? 'var(--color-lavender-deep)' : 'var(--color-lavender)',
            }}
          />
        ))}
      </div>
      {error && (
        <p className="error-text" role="alert" style={{ textAlign: 'center' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(64px, 1fr))', gap: 12, width: '100%' }}>
        {KEYS.map((key) => (
          <Button key={key} label={`Chiffre ${key}`} disabled={disabled || busy} onClick={() => append(key)} style={{ fontSize: '1.4rem' }}>
            {key}
          </Button>
        ))}
        <Button label="Effacer" disabled={disabled || busy} onClick={() => setDigits('')} icon={<Delete size={22} />} />
        <Button label="Chiffre 0" disabled={disabled || busy} onClick={() => append('0')} style={{ fontSize: '1.4rem' }}>
          0
        </Button>
        <Button label="Effacer le dernier chiffre" disabled={disabled || busy} onClick={() => setDigits((d) => d.slice(0, -1))}>
          ⌫
        </Button>
      </div>
      <Button variant="primary" disabled={disabled || busy || digits.length < MIN_LENGTH} onClick={submit} style={{ width: '100%' }}>
        {submitLabel}
      </Button>
    </div>
  );
}
