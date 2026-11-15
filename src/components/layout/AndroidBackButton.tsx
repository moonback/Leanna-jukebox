import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Le bouton Retour Android ramène toujours vers l'accueil enfant.
 * Depuis l'accueil, l'application est minimisée au lieu d'être fermée.
 */
export function AndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;

    void CapacitorApp.addListener('backButton', () => {
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
        return;
      }
      void CapacitorApp.minimizeApp();
    }).then((listener) => {
      if (disposed) {
        void listener.remove();
      } else {
        removeListener = () => listener.remove();
      }
    }).catch((error: unknown) => {
      console.warn('[Leanna] Gestion du bouton Retour Android indisponible :', error);
    });

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [location.pathname, navigate]);

  return null;
}
