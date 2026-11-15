import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Cloud, LogOut, RefreshCw, Radio, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../storage/cloud/supabaseClient';
import { confirmPendingDeletions, getSyncStatus, restoreFromCloud, subscribeSync, syncNow } from '../../storage/cloud/sync';
import { toUserMessage } from '../../services/errors';

const STATE_LABEL = { idle: 'À jour', syncing: 'Synchronisation…', error: 'Erreur de synchronisation' } as const;
const SKIP_KEY = 'leanna-cloud-skip';

/** Connexion cloud facultative, visible uniquement dans les réglages protégés des parents. */
export function CloudSyncCard() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(SKIP_KEY) === '1');

  if (!supabase) {
    return (
      <div className="card stack">
        <h2 style={{ margin: 0 }}>Compte et synchronisation</h2>
        <p className="muted" style={{ margin: 0 }}>Le mode local est actif. Configure les variables Supabase pour activer la synchronisation familiale.</p>
      </div>
    );
  }
  const client = supabase;
  const run = async (action: () => Promise<void>) => {
    setError(null);
    setInfo(null);
    try { await action(); } catch (err) { setError(toUserMessage(err)); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.user) {
          localStorage.removeItem(SKIP_KEY);
          setDismissed(false);
          setInfo('Connexion réussie. La synchronisation démarre en arrière-plan.');
        }
      } else {
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.session?.user) {
          localStorage.removeItem(SKIP_KEY);
          setDismissed(false);
          setInfo('Compte créé et connecté. La synchronisation démarre en arrière-plan.');
        } else {
          setInfo('Compte créé. Confirme ton adresse e-mail, puis connecte-toi depuis cet espace.');
        }
      }
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>Compte et synchronisation</h2>
      {status.userId ? (
        <>
          <p style={{ margin: 0, fontWeight: 800 }}>
            {STATE_LABEL[status.state]}
            {status.lastSyncedAt ? ` · ${new Date(status.lastSyncedAt).toLocaleTimeString('fr-FR')}` : ''}
          </p>
          <p className="muted" role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            {status.realtime === 'connected' ? <Wifi size={18} /> : status.realtime === 'connecting' ? <Radio size={18} /> : <WifiOff size={18} />}
            {status.realtime === 'connected' ? 'Temps réel actif · les autres appareils sont écoutés' : status.realtime === 'connecting' ? 'Connexion au canal temps réel…' : 'Temps réel indisponible · mode local conservé'}
          </p>
          {(status.error || error) && <p className="error-text" role="alert">{status.error ?? error}</p>}
          {status.confirmationRequired && (
            <div className="glass stack" role="alert" style={{ padding: 14 }}>
              <strong>Confirmation parentale requise</strong>
              <p style={{ margin: 0 }}>Cette synchronisation contient {status.pendingDeleteCount} suppressions et retirerait plus de 30 % d’au moins une catégorie d’éléments du cloud. Vérifie que ces suppressions sont volontaires avant de continuer.</p>
              <Button variant="danger" disabled={status.state === 'syncing'} onClick={() => run(async () => {
                confirmPendingDeletions();
                await syncNow();
              })}>
                Confirmer les suppressions
              </Button>
            </div>
          )}
          <Button variant="primary" icon={<Cloud size={20} />} disabled={status.state === 'syncing'} onClick={() => run(syncNow)}>
            Synchroniser maintenant
          </Button>
          <Button icon={<RefreshCw size={20} />} disabled={status.state === 'syncing'} onClick={() => run(restoreFromCloud)}>
            Récupérer depuis le cloud
          </Button>
          <Button variant="danger" icon={<LogOut size={20} />} onClick={() => run(async () => { await client.auth.signOut(); })}>
            Se déconnecter
          </Button>
        </>
      ) : dismissed ? (
        <>
          <p className="muted" style={{ margin: 0 }}>Mode local activé sur cet appareil. Aucune connexion n’est nécessaire pour écouter les chansons ou utiliser les jeux.</p>
          <Button onClick={() => { localStorage.removeItem(SKIP_KEY); setDismissed(false); }}>
            Configurer la synchronisation familiale
          </Button>
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>La connexion est facultative et ne bloque jamais l’espace enfant. Connecte-toi ici pour partager la bibliothèque entre les appareils de la famille.</p>
          <form className="stack" onSubmit={submit}>
            <label className="field">
              Adresse e-mail
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              Mot de passe
              <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="error-text" role="alert">{error}</p>}
            {info && <p role="status" style={{ fontWeight: 800 }}>{info}</p>}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Connexion…' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
            </Button>
          </form>
          <Button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
            {mode === 'signin' ? 'Créer un compte' : 'J’ai déjà un compte'}
          </Button>
          <Button onClick={() => { localStorage.setItem(SKIP_KEY, '1'); setDismissed(true); }}>
            Continuer sans compte
          </Button>
        </>
      )}
      {error && status.userId && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
