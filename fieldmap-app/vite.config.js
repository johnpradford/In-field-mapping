import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// `base` controls where the built site expects to be served from.
// On GitHub Pages, project sites live under `/<repo-name>/`, so the
// production build needs `base: '/In-field-mapping/'` for the JS / CSS /
// manifest / service worker URLs to resolve correctly.
// Locally (`vite dev` / `vite preview`) we want '/'. The env variable
// FIELDMAP_BASE lets the GitHub Actions workflow override this in CI.
var BASE = process.env.FIELDMAP_BASE || '/';
export default defineConfig({
    base: BASE,
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true,
        port: 5173,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    map: ['maplibre-gl', 'pmtiles'],
                    fileformats: ['shpjs', '@tmcw/togeojson'],
                    react: ['react', 'react-dom'],
                },
            },
        },
    },
});
