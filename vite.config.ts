/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves project sites under /<repo>/. Override with BASE_PATH if the
// repo is renamed or a custom domain is used (then set BASE_PATH=/).
const base = process.env.BASE_PATH ?? '/whats-for-din-din/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: "What's for Din-Din?",
        short_name: 'Din-Din',
        description: 'A WFPB meal decider that resurfaces forgotten favorites.',
        theme_color: '#2f7d4f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          // Chrome/Android only treats the app as installable when it finds
          // raster PNG icons at 192 and 512 — an SVG-only set hides the
          // "Install app" / "Add to Home Screen" entry.
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
