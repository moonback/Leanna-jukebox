import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Chemins relatifs à la racine du projet (npm run test s'exécute depuis ce dossier).
const read = (path: string) => readFileSync(path, 'utf8');

/**
 * Contrôles statiques du responsive : la vérification visuelle réelle (800×1280, 1280×800, 1024×768,
 * 1920×1080, 390×844) se fait dans le navigateur ; ces tests garantissent les réglages de base.
 */
describe('responsive — garde-fous statiques', () => {
  it('active les safe areas Android (viewport-fit=cover)', () => {
    expect(read('index.html')).toMatch(/viewport-fit=cover/);
  });

  it('bloque le débordement horizontal et prévoit les marges de sécurité', () => {
    const css = read('src/styles/global.css');
    expect(css).toMatch(/overflow-x:\s*hidden/);
    const tokens = read('src/styles/variables.css');
    expect(tokens).toMatch(/--safe-top:\s*env\(safe-area-inset-top/);
    expect(tokens).toMatch(/--safe-bottom:\s*env\(safe-area-inset-bottom/);
  });

  it('les grilles de cartes s’adaptent à la largeur disponible', () => {
    const css = read('src/styles/global.css');
    expect(css).toMatch(/repeat\(auto-fill, minmax\(min\(100%, 150px\), 1fr\)\)/);
  });

  it('désactive le zoom au double-tap sur les boutons (tablette)', () => {
    expect(read('src/styles/global.css')).toMatch(/touch-action:\s*manipulation/);
  });
});
