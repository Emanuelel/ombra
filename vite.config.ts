import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { port: 5199, strictPort: true, host: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      workbox: {
        // The committed OSM building data + geometry libs push the bundle past
        // workbox's default 2 MiB precache cap; allow the app to be cached offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Adds push + notificationclick handlers to the generated service worker.
        importScripts: ['push-handler.js'],
        // Don't let the SPA navigation fallback swallow API routes — top-level
        // navigations to /api/* (e.g. the Google OAuth redirect + callback) must hit
        // the server, not be served index.html from the cache.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Ombra — caça la fresca',
        short_name: 'Ombra',
        description: 'Find the shaded terraces of Barcelona — and steal your friends’ crowns.',
        theme_color: '#FF4A31',
        background_color: '#FF4A31',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
