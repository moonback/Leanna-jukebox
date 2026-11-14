import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
import { installMenuBlocking } from './services/blockMenus';

// Seul le simple appui compte : pas de clic droit ni de menu d'appui long.
installMenuBlocking();

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
