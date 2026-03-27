import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    
    build: {
        rollupOptions: {
            input: {
                // Main page compile (not sure why but I'll have to put the whole thing in for now)
                main: 'index.html',
                about: 'about.html',
                services: 'Services.html',
                projects: 'projects.html',
                projectTemplate: 'project-template.html',
                project1: 'project1.html',
                project2: 'project2.html',
                project3: 'project3.html',
                // Error / status pages
                notFound: '404.html',
                underConstruction: 'under-construction.html',
                // Dev Log / documentation
                progress: 'progress.html',
                // Apps for EUC
                eucVisualiser: 'euc-visualiser.html'
            }
        }
        // ─────────────────────────────────────────────────────────────────────
        // WHY THE "chunk larger than 500 kB" WARNING APPEARS
        // ─────────────────────────────────────────────────────────────────────
        // The EUC Visualiser (euc-visualiser.html / src/euc-visualiser.jsx) is
        // a React application that imports several heavy libraries in one bundle:
        //
        //   • react + react-dom      ~130 kB   — core React runtime
        //   • recharts               ~230 kB   — chart components
        //   • react-leaflet + leaflet ~150 kB  — interactive map
        //   • @mui/material          ~270 kB   — UI components
        //   • papaparse              ~ 45 kB   — CSV parser
        //
        // All of these are bundled together because they are imported directly
        // at the top of EUC_App.jsx.  Vite's default warning threshold is 500 kB
        // minified; the EUC chunk lands at ~1 006 kB (~300 kB gzipped).
        //
        // The warning is EXPECTED and HARMLESS for this project because:
        //   - The EUC Visualiser is an interactive tool page, not a landing page.
        //     Users navigate there deliberately, so a slightly longer load is OK.
        //   - The gzipped size (300 kB) is what actually travels over the network,
        //     which is reasonable for a feature-rich data-visualisation app.
        //
        // HOW TO FIX IT IN THE FUTURE (if load time becomes a concern):
        //   1. Lazy-load heavy components with React.lazy() + Suspense so the
        //      map or charts only download when the user interacts with them.
        //   2. Use rollupOptions.output.manualChunks to split vendor libraries
        //      into separate cacheable chunks (e.g. a "vendor-charts" chunk).
        //   3. Replace heavy libraries — e.g. swap @mui/material for a lighter
        //      component library, or use a lighter charting lib.
        //
        // To raise or silence the warning without changing code, add:
        //   build: { chunkSizeWarningLimit: 1500 }
        // ─────────────────────────────────────────────────────────────────────
    },
    
    server: {
        port: 64853,
    }
})
