import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// https://vitejs.dev/config/
// `base` differs between dev and prod:
//   - dev server runs at "/" for convenience
//   - production build is served from a GitHub Pages *project* site at
//     https://<user>.github.io/tuples/, so assets must be referenced under "/tuples/".
// If you later move to a custom domain or a user/org page (served at "/"),
// change the build base back to "/".
export default defineConfig(function (_a) {
    var command = _a.command;
    return ({
        base: command === 'build' ? '/tuples/' : '/',
        plugins: [react(), tailwindcss()],
        build: {
            // Rollup's generic per-chunk warning is noise here: the only chunks over
            // 500 kB are intentionally lazy (the three.js background). The real guard is
            // the gzipped critical-path budget in scripts/check-bundle-size.mjs.
            chunkSizeWarningLimit: 900,
            // Split large, independently-cacheable vendors out of the main chunk.
            // Heavy, interaction-only libs (three, recharts, tone, confetti) are already
            // lazy-loaded via dynamic import() elsewhere, so they get their own chunks
            // automatically and are excluded here.
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        if (!id.includes('node_modules'))
                            return;
                        if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/'))
                            return 'react-vendor';
                        if (id.includes('/@codemirror/') || id.includes('/@uiw/') || id.includes('/@lezer/'))
                            return 'editor'; // CodeMirror SQL editor
                        if (id.includes('/@xyflow/'))
                            return 'flow'; // React Flow schema graph
                        if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/'))
                            return 'motion';
                        if (id.includes('/sql.js/'))
                            return 'sqljs';
                    },
                },
            },
        },
    });
});
