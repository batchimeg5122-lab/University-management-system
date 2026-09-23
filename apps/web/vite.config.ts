import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    /**
     * PWA: компьютер, утсан дээр "Суулгах" боломжтой, статик файлуудыг кэшлэнэ.
     * API хүсэлтийг КЭШЛЭХГҮЙ (нэвтрэлт, хувийн мэдээлэл) — зөвхөн апп-ын бүрхүүл.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'apple-touch-icon.png', 'brand/*.png'],
      manifest: {
        name: 'Их Засаг — Сургалт, санхүүгийн систем',
        short_name: 'Их Засаг',
        description: 'Их Засаг Их Сургуулийн сургалт, санхүүгийн нэгдсэн систем',
        lang: 'mn',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F6F7F9',
        theme_color: '#1E4B8F',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Нээлттэй шалгах хуудсууд ч SPA-аар ачаална; API-г хэзээ ч кэшлэхгүй
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173 },
});
