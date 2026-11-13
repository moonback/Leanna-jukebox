import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

const LONG_PRESS_MS = 2000;

/**
 * Accès discret à l'espace parents. En mode enfant, il faut un appui long de 2 secondes :
 * un simple tap de l'enfant ne doit jamais ouvrir l'espace parents.
 */
export function ParentAccessButton() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const timer = useRef<number | null>(null);
  const [pressing, setPressing] = useState(false);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };

  const open = () => navigate('/parents');

  return (
    <button
      type="button"
      aria-label={settings.childMode ? 'Espace parents (maintenir 2 secondes)' : 'Espace parents'}
      title="Espace parents"
      onClick={() => {
        if (!settings.childMode) open();
      }}
      onPointerDown={() => {
        if (!settings.childMode) return;
        setPressing(true);
        timer.current = window.setTimeout(() => {
          timer.current = null;
          setPressing(false);
          open();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(255,255,255,0.6)',
        opacity: pressing ? 1 : 0.7,
        boxShadow: pressing ? '0 0 0 6px rgba(201,166,255,0.5)' : 'none',
        transition: 'box-shadow 0.2s ease, opacity 0.2s ease',
      }}
    >
      <Lock size={22} aria-hidden="true" />
    </button>
  );
}
