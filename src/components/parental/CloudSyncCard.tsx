import { useState, useSyncExternalStore } from 'react';
import { Cloud, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../storage/cloud/supabaseClient';
import { getSyncStatus, restoreFromCloud, subscribeSync, syncNow } from '../../storage/cloud/sync';
import { toUserMessage } from '../../services/errors';

const STATE_LABEL = { idle: 'À jour', syncing: 'Synchronisation…', error: 'Erreur de synchronisation' } as const;

/** État de la synchronisation Supabase, envoi/récupération manuels et déconnexion. */
export function CloudSyncCard() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus);
  const [error, setError] = useState<string | null>(null);
  if (!supabase) return null;
  const client = supabase;

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(toUserMessage(err));
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
          {(status.error || error) && <p className="error-text" role="alert">{status.error ?? error}</p>}
          <Button variant="primary" icon={<Cloud size={20} />} disabled={status.state === 'syncing'} onClick={() => run(syncNow)}>
            Envoyer vers le cloud
          </Button>
          <Button icon={<RefreshCw size={20} />} disabled={status.state === 'syncing'} onClick={() => run(restoreFromCloud)}>
            Récupérer depuis le cloud
          </Button>
          <Button variant="danger" icon={<LogOut size={20} />} onClick={() => run(async () => { await client.auth.signOut(); })}>
            Se déconnecter
          </Button>
        </>
      ) : (
        <p className="muted" style={{ margin: 0 }}>Aucun compte connecté : les données restent sur cet appareil.</p>
      )}
    </div>
  );
}
