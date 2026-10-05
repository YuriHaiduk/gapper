/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Same base in dev and prod so URLs are identical (SPEC §21).
const base = process.env.BASE_PATH ?? '/gapper/';

/**
 * GitHub Pages has no rewrites: it serves `404.html` for unknown paths, so a copy of
 * `index.html` boots the SPA on deep links (SPEC §21). Not precached (see `globIgnores`).
 */
function spaFallback404(): Plugin {
  return {
    name: 'gapper:spa-fallback-404',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset') this.error('index.html missing from the bundle');
      this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
    },
  };
}

/** Build-only Content-Security-Policy meta (SPEC §22, D56); dev keeps Vite's inline HMR client. */
function contentSecurityPolicy(supabaseUrl: string | undefined): Plugin {
  // CI without the variable must still build; the wildcard only loosens connect-src.
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : 'https://*.supabase.co';
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    // ProseMirror (notes editor) sets inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // Recorded/downloaded audio is played from object URLs.
    "media-src 'self' blob:",
    `connect-src 'self' ${supabaseOrigin}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  return {
    name: 'gapper:csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // "New version available · Reload" toast instead of reloading under a form (D19).
        registerType: 'prompt',
        // Registered by `useRegisterSW` in `UpdatePrompt`.
        injectRegister: false,
        // Icons are already matched by `globPatterns`.
        includeManifestIcons: false,
        manifest: {
          name: 'Gapper — Vocabulary',
          short_name: 'Gapper',
          description: 'Personal vocabulary cards',
          lang: 'en',
          start_url: `${base}cards`,
          scope: base,
          id: base,
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#ffffff',
          background_color: '#ffffff',
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
          // Every JS chunk is precached, incl. the lazy notes editor (form opens offline).
          // The manifest is added by the plugin itself.
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          globIgnores: ['404.html'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          // No runtimeCaching: Supabase data goes through IndexedDB, audio through audio_blobs.
        },
      }),
      contentSecurityPolicy(env.VITE_SUPABASE_URL),
      spaFallback404(),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      // The app chunk (~700 kB, mostly supabase-js) is precached by the service worker, so
      // its size only matters on first load and after an update (D57).
      chunkSizeWarningLimit: 800,
    },
    server: { host: true, port: 5173, strictPort: true },
    preview: { host: true, port: 4173, strictPort: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      alias: {
        'virtual:pwa-register/react': fileURLToPath(
          new URL('./src/test/pwaRegisterMock.ts', import.meta.url),
        ),
      },
    },
  };
});
