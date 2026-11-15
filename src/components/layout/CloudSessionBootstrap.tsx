import { useEffect } from 'react';
import { supabase } from '../../storage/cloud/supabaseClient';
import { startSync, stopSync } from '../../storage/cloud/sync';

/** Restaure le cloud en arrière-plan sans retarder le montage de l’espace enfant. */
export function CloudSessionBootstrap() {
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        stopSync();
      } else if (event === 'SIGNED_IN' && session?.user.id) {
        queueMicrotask(() => {
          if (active) void startSync(session.user.id);
        });
      }
    });

    void client.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return;
      if (error) {
        stopSync();
        return;
      }
      const userId = sessionData.session?.user.id;
      if (userId) void startSync(userId);
      else stopSync();
    }).catch(() => {
      if (active) stopSync();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
