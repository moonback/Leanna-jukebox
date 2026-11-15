/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const offlinePrecache: Plugin = {
  name: 'leanna-offline-precache',
  generateBundle(_options, bundle) {
    const files = Object.keys(bundle)
      .filter((file) => !file.endsWith('.map') && file !== 'sw.js' && file !== 'precache-manifest.js')
      .map((file) => `./${file}`);
    this.emitFile({
      type: 'asset',
      fileName: 'precache-manifest.js',
      source: `self.LEANNA_PRECACHE_URLS = ${JSON.stringify(files)};`,
    });
  },
};

// base relatif : indispensable pour une future enveloppe Capacitor (fichiers servis depuis le disque).
export default defineConfig({
  base: './',
  plugins: [react(), offlinePrecache],
  server: { host: true, port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
