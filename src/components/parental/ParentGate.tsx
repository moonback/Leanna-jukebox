import { useEffect, useState, type ReactNode } from 'react';
import { PinPad } from './PinPad';
import { useParentAuth } from '../../hooks/useParentAuth';
import { validatePinFormat } from '../../security/pinService';
import { deleteAllData } from '../../storage/backup';
import { db } from '../../storage/database';
import { toUserMessage } from '../../services/errors';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';

/**
 * Protection de l'espace parents : création du PIN à la première utilisation, puis déverrouillage.
 * Les enfants ne voient que l'écran de code, jamais le contenu protégé.
 */
export function ParentGate({ children }: { children: ReactNode }) {
  const auth = useParentAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [setupFirst, setSetupFirst] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const lockRemaining = Math.max(0, Math.ceil((auth.lockedUntil - now) / 1000));

  useEffect(() => {
    if (lockRemaining <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockRemaining]);

  if (!auth.loaded) return <LoadingState label="Ouverture de l’espace parents…" />;
  if (unlocked) return <>{children}</>;

  if (!auth.hasPin) {
    if (setupFirst === null) {
      return (
        <div className="row-wrap" style={{ justifyContent: 'center' }}>
          <PinPad
            title="Bienvenue, parent !"
            hint="Crée un code PIN de 4 à 6 chiffres pour protéger cet espace."
            submitLabel="Continuer"
            onSubmit={async (pin) => {
              const format = validatePinFormat(pin);
              if (format) return 'Le code doit contenir entre 4 et 6 chiffres.';
              setSetupFirst(pin);
              return null;
            }}
          />
        </div>
      );
    }
    return (
      <div className="row-wrap" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <PinPad
          title="Confirme ton code PIN"
          hint="Saisis à nouveau le même code."
          submitLabel="Enregistrer le code"
          onSubmit={async (pin) => {
            if (pin !== setupFirst) {
              setSetupError('Les deux codes ne correspondent pas. Recommence.');
              setSetupFirst(null);
              return 'Les deux codes ne correspondent pas. Recommence.';
            }
            try {
              await auth.createPin(pin);
              setUnlocked(true);
              return null;
            } catch (error) {
              return toUserMessage(error);
            }
          }}
        />
        {setupError && <p className="muted">{setupError}</p>}
      </div>
    );
  }

  const locked = lockRemaining > 0;
  return (
    <div className="row-wrap" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <PinPad
        title="Espace parents"
        hint={
          locked
            ? `Trop d’essais. Réessaie dans ${lockRemaining} seconde${lockRemaining > 1 ? 's' : ''}.`
            : 'Saisis ton code PIN.'
        }
        submitLabel="Ouvrir"
        disabled={locked}
        onSubmit={async (pin) => {
          const result = await auth.unlock(pin);
          if (result.status === 'ok') {
            setUnlocked(true);
            return null;
          }
          setNow(Date.now());
          if (result.status === 'locked') return 'Trop d’essais. Patiente un instant.';
          return `Code incorrect. Essaie encore (tentative ${result.failedAttempts}).`;
        }}
      />
      {message && <p className="muted">{message}</p>}
      {!confirmReset ? (
        <Button size="normal" variant="secondary" onClick={() => setConfirmReset(true)}>
          Code oublié ?
        </Button>
      ) : (
        <div className="glass" style={{ padding: 16, display: 'grid', gap: 10, maxWidth: 420, textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 800 }}>
            Réinitialiser efface toutes les chansons, playlists et le code PIN. Cette action est définitive.
          </p>
          <div className="row-wrap" style={{ justifyContent: 'center' }}>
            <Button variant="danger" onClick={async () => {
              try {
                await deleteAllData(db);
                setMessage('Données effacées. Crée un nouveau code PIN.');
                setConfirmReset(false);
              } catch (error) {
                setMessage(toUserMessage(error));
              }
            }}>
              Tout effacer
            </Button>
            <Button onClick={() => setConfirmReset(false)}>Annuler</Button>
          </div>
        </div>
      )}
    </div>
  );
}
