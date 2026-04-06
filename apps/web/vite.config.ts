/// <reference types="vitest" />

import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Point Vite directly at the TS source so it handles ESM natively.
      // NestJS still uses the compiled CJS dist at runtime.
      '@tabpilot/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Function form is required because the object form only matches exact
        // package entry points — it misses subpath exports like react-dom/client
        // and transitive internals like scheduler (react-dom's scheduler dep).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Extract the exact package name (handles scoped packages too)
          const m = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
          if (!m) return;
          const pkg = m[1];

          // React runtime — exact package names only (avoids matching
          // @floating-ui/react-dom or react-hot-toast via substring checks)
          if (
            ['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom'].includes(pkg)
          ) {
            return 'react';
          }
          // Animation
          if (['framer-motion', 'motion-dom', 'motion-utils'].includes(pkg)) return 'motion';
          // Icons
          if (pkg === 'lucide-react') return 'icons';
          // Data fetching
          if (['@tanstack/react-query', '@tanstack/query-core', 'axios'].includes(pkg))
            return 'query';
          // WebSocket
          if (
            [
              'socket.io-client',
              'engine.io-client',
              'engine.io-parser',
              '@socket.io/component-emitter',
              'socket.io-parser',
            ].includes(pkg)
          ) {
            return 'socket';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      reportsDirectory: './coverage',
      exclude: ['src/test/**', '**/*.d.ts'],
    },
  },
});
