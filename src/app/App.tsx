import { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ensureSeeded } from '../storage/seed';
import { db } from '../storage/database';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';
import { SpeechNotice } from '../components/ui/SpeechNotice';
import { OfflineStatus } from '../components/layout/OfflineStatus';
import { AndroidBackButton } from '../components/layout/AndroidBackButton';
import { CloudSessionBootstrap } from '../components/layout/CloudSessionBootstrap';
import { toUserMessage } from '../services/errors';

export function App() {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureSeeded(db)
      .then(() => !cancelled && setReady(true))
      .catch((error: unknown) => !cancelled && setFailure(toUserMessage(error)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failure) {
    return (
      <div role="alert" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontWeight: 900 }}>{failure}</p>
        <p className="muted">Le stockage de la tablette est peut-être plein ou bloqué.</p>
      </div>
    );
  }
  if (!ready) return <LoadingState label="Préparation du jukebox…" />;

  // L'authentification cloud n'est jamais un prérequis au parcours enfant.
  // La session Supabase est restaurée en tâche de fond, sans bloquer l'accueil.
  return (
    <ErrorBoundary>
      <HashRouter>
        <CloudSessionBootstrap />
        <AndroidBackButton />
        <SpeechNotice />
        <OfflineStatus />
        <AppRoutes />
      </HashRouter>
    </ErrorBoundary>
  );
}
