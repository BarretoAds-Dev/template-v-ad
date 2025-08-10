// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import viteCompression from 'vite-plugin-compression';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  outDir: './dist',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    },

    imageService: "cloudflare"
  }),
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },


  vite: {
    plugins: [
      // Tailwind CSS
      tailwindcss(),
      // Compresión Brotli
      viteCompression({
        threshold: 10240,
        filter: /\.(js|mjs|json|css|html|svg|jsx|tsx|astro|txt|xml)$/,
        algorithm: 'brotliCompress',
        ext: '.br',
        verbose: true,
        compressionOptions: { level: 11 },
      }),
      // Compresión Gzip como fallback
      viteCompression({
        threshold: 10240,
        filter: /\.(js|mjs|json|css|html|svg|jsx|tsx|astro|txt|xml)$/,
        algorithm: 'gzip',
        ext: '.gz',
        verbose: true,
        compressionOptions: { level: 9 },
      }),
    ],
  }
});