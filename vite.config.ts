import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { port: 5199, strictPort: true, host: true },
  plugins: [
    react(),
    VitePWA({
      // Prompt users to reload for a new version instead of silently auto-updating,
      // so a fresh deploy is picked up on the same visit (see src/ui/UpdatePrompt.tsx).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'badge-96.png'],
      workbox: {
        // The committed OSM building data + geometry libs push the bundle past
        // workbox's default 2 MiB precache cap; allow the app to be cached offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Adds push + notificationclick handlers to the generated service worker.
        importScripts: ['push-handler.js'],
        // Don't let the SPA navigation fallback swallow API routes or the static
        // legal pages. Top-level navigations to /api/* (Google OAuth) and to the
        // /privacy and /terms pages must hit the server, not index.html from cache.
        navigateFallbackDenylist: [/^\/api\//, /^\/privacy/, /^\/terms/],
      },
      manifest: {
        name: 'Ombra: caça la fresca',
        short_name: 'Ombra',
        description: 'Find the shaded terraces of Barcelona and steal your friends’ crowns.',
        theme_color: '#FF4A31',
        background_color: '#FF4A31',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Dedicated maskable icon: crown padded into the adaptive-icon safe zone so
          // Android's launcher zoom/crop doesn't blow it up. Full-bleed `any` icons above
          // must NOT be reused as maskable or they look zoomed on the home screen.
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
