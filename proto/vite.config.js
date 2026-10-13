import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  resolve: {
    alias: [
      { find: /^\.\/rapier_wasm3d$/, replacement: fileURLToPath(new URL('./src/rapier-shim.js', import.meta.url)) },
    ],
  },
  build: { target: 'es2022' },
  server: {
    proxy: { '/ws': { target: 'ws://127.0.0.1:8097', ws: true } },
  },
});
