import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Each production build gets an id, baked into the client and written to dist/build.json for the
// server: after a deploy, a page still running the old build sees a different id and reloads.
// The dev server's client is 'dev' and never reloads for this.
export default defineConfig(({ command }) => {
  const build = command === 'build' ? Date.now().toString(36) : 'dev';
  return {
    base: './',
    define: { __BUILD__: JSON.stringify(build) },
    plugins: [{
      name: 'build-id',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'build.json', source: JSON.stringify({ build }) });
      },
    }],
    resolve: {
      alias: [
        { find: /^\.\/rapier_wasm3d$/, replacement: fileURLToPath(new URL('./src/rapier-shim.js', import.meta.url)) },
      ],
    },
    build: { target: 'es2022' },
    server: {
      proxy: { '/ws': { target: 'ws://127.0.0.1:8097', ws: true } },
    },
  };
});
