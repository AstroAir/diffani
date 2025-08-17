import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import { run as runCssDts } from 'typed-css-modules';
import react from '@vitejs/plugin-react';
import createSvgSpritePlugin from 'vite-plugin-svg-sprite';
import tailwindcss from '@tailwindcss/vite';

const isDev = process.env.NODE_ENV === 'development';
const rootDir = fileURLToPath(new URL('.', import.meta.url));
const srcDir = path.resolve(rootDir, 'src');

runCssDts(srcDir, {
  pattern: '**/*.module.scss',
  watch: isDev,
}).catch(console.error);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '#': srcDir,
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    createSvgSpritePlugin({
      symbolId: 'icon-[name]-[hash]',
      include: '**/icons/*.svg',
    }),
    tailwindcss(),
  ],
  server: {
    port: 10001,
  },
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          react: ['react', 'react-dom'],
          pixi: ['pixi.js'],
          codemirror: [
            '@codemirror/view',
            '@codemirror/state',
            '@codemirror/language',
            '@codemirror/commands',
            'codemirror',
          ],
          'codemirror-langs': [
            '@codemirror/lang-javascript',
            '@codemirror/lang-python',
            '@codemirror/lang-cpp',
            '@codemirror/lang-rust',
            '@codemirror/lang-css',
            '@codemirror/lang-html',
            '@codemirror/lang-json',
            '@codemirror/lang-sql',
            '@codemirror/lang-xml',
          ],
        },
      },
    },
    // Enable source maps for production debugging
    sourcemap: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
});
