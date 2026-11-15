import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Phase 1 — fiabilité du parcours enfant', () => {
  it('ne conditionne plus le démarrage de l’application à une connexion cloud', () => {
    const app = read('src/app/App.tsx');
    expect(app).toMatch(/<HashRouter>/);
    expect(app).not.toMatch(/AuthGate/);
    expect(app).toMatch(/CloudSessionBootstrap/);
    const bootstrap = read('src/components/layout/CloudSessionBootstrap.tsx');
    expect(bootstrap).toMatch(/getSession\(/);
    expect(bootstrap).toMatch(/startSync\(/);
  });

  it('réserve la connexion Supabase aux réglages parents et mémorise le mode local', () => {
    const cloud = read('src/components/parental/CloudSyncCard.tsx');
    expect(cloud).toMatch(/signInWithPassword/);
    expect(cloud).toMatch(/localStorage\.setItem\(SKIP_KEY/);
    expect(cloud).toMatch(/Continuer sans compte/);
  });

  it('charge les pages à la demande', () => {
    const routes = read('src/app/routes.tsx');
    expect(routes).toMatch(/lazy\(/);
    expect(routes).toMatch(/<Suspense/);
  });

  it('impose la pause du lecteur et exige le PIN pour reprendre sans option de remise à zéro', () => {
    const page = read('src/pages/PlayerPage.tsx');
    expect(page).toMatch(/forcePaused=\{breakShown\}/);
    expect(page).toMatch(/<ParentGate allowReset=\{false\}>/);
    expect(page).toMatch(/role="dialog"/);
  });
});
