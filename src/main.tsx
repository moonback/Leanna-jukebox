import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
import { installMenuBlocking } from './services/blockMenus';

// Seul le simple appui compte : pas de clic droit ni de menu d'appui long.
installMenuBlocking();

// Le service worker n'est activé qu'en production. Il met en cache l'app shell,
// les ressources chargées et les miniatures YouTube déjà consultées.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((error: unknown) => console.warn('[Leanna] Cache hors ligne indisponible :', error));
  }, { once: true });
}

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
