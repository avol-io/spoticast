/// <reference types='vitest' />
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const outDir = './dist/sposticast';

// GitHub Pages serves 404.html for unknown paths: copying the SPA shell there
// lets deep links like /podcast/:id load the app instead of a GitHub 404.
function spaFallback(): Plugin {
  return {
    name: 'sposticast:spa-fallback',
    apply: 'build',
    closeBundle() {
      const dir = resolve(import.meta.dirname, outDir);
      copyFileSync(resolve(dir, 'index.html'), resolve(dir, '404.html'));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  const base = env.VITE_BASE || '/';

  return {
    root: import.meta.dirname,
    base,
    cacheDir: './node_modules/.vite/sposticast',
    // Spotify rejects "localhost" redirect URIs: use the loopback IP instead.
    server: {
      port: 4200,
      host: '127.0.0.1',
    },
    preview: {
      port: 4300,
      host: '127.0.0.1',
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Sposticast',
          short_name: 'Sposticast',
          description: 'Podcast client for Spotify',
          theme_color: '#0f1115',
          background_color: '#0f1115',
          display: 'standalone',
          orientation: 'any',
          start_url: base,
          scope: base,
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/callback/],
          runtimeCaching: [
            {
              // Cover art from Spotify's image CDN.
              urlPattern: /^https:\/\/(i|mosaic|image-cdn-[a-z]+)\.scdn\.co\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'spotify-images',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/charts\/[a-z]{2}\.json$/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'charts' },
            },
          ],
        },
      }),
      spaFallback(),
    ],
    build: {
      outDir,
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    test: {
      name: 'sposticast',
      watch: false,
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: './coverage/sposticast',
        provider: 'v8' as const,
      },
    },
  };
});
