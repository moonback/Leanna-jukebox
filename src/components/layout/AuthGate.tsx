import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from '../../storage/cloud/supabaseClient';
import { startSync, stopSync } from '../../storage/cloud/sync';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';

const SKIP_KEY = 'leanna-cloud-skip';

type Phase = 'loading' | 'signed-out' | 'ready';

/**
 * Connexion du compte parent (Supabase) et démarrage de la synchronisation.
 * Sans configuration Supabase, ou si le parent choisit de continuer hors compte, l'appli reste 100 % locale.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(supabase && sessionStorage.getItem(SKIP_KEY) !== '1' ? 'loading' : 'ready');

  useEffect(() => {
    const client = supabase;
    if (!client || sessionStorage.getItem(SKIP_KEY) === '1') return;
    let cancelled = false;

    const apply = async (userId: string | null) => {
      if (userId) {
        await startSync(userId);
        if (!cancelled) setPhase('ready');
      } else {
        stopSync();
        if (!cancelled) setPhase('signed-out');
      }
    };

    void client.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    // Le démarrage est géré par getSession et par le formulaire ; ici on ne traite que la déconnexion.
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') void apply(null);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  if (phase === 'loading') return <LoadingState label="Synchronisation de ta bibliothèque…" />;
  if (phase === 'signed-out') {
    return (
      <LoginForm
        onSignedIn={(userId) => {
          setPhase('loading');
          void startSync(userId).then(() => setPhase('ready'));
        }}
        onSkip={() => {
          sessionStorage.setItem(SKIP_KEY, '1');
          setPhase('ready');
        }}
      />
    );
  }
  return <>{children}</>;
}

function LoginForm({ onSignedIn, onSkip }: { onSignedIn: (userId: string) => void; onSkip: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'signin') {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        onSignedIn(data.user.id);
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        if (data.session) onSignedIn(data.session.user.id);
        else setInfo('Compte créé. Confirme ton adresse e-mail puis connecte-toi.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 16 }}>
      <form className="card stack" onSubmit={submit} style={{ width: 'min(420px, 100%)' }} aria-label="Connexion parent">
        <h1 style={{ margin: 0 }}>Compte parent</h1>
        <p className="muted" style={{ margin: 0 }}>
          Connecte-toi pour retrouver les chansons sur tous tes appareils.
        </p>
        <label className="field">
          Adresse e-mail
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Mot de passe
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error-text" role="alert">{error}</p>}
        {info && <p role="status" style={{ fontWeight: 800 }}>{info}</p>}
        <Button type="submit" variant="primary" disabled={busy}>
          {mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
        </Button>
        <Button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Créer un compte' : 'J’ai déjà un compte'}
        </Button>
        <Button onClick={onSkip}>Continuer sans compte</Button>
      </form>
    </main>
  );
}
